import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { attachAuthContextPreHandler } from '../auth/auth.context.middleware.js';
import { rbacGuard } from '../rbac/rbac.guard.js';
import { syslogRouterOsService } from './syslog-routeros.service.js';
import { syslogService } from './syslog.service.js';

const readPreHandler = [attachAuthContextPreHandler, rbacGuard('syslog:read')];
const managePreHandler = [attachAuthContextPreHandler, rbacGuard('syslog:manage')];

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(10).max(250).optional().default(50),
  deviceId: z.string().trim().min(1).optional(),
  severity: z.coerce.number().int().min(0).max(7).optional(),
  facility: z.coerce.number().int().min(0).max(23).optional(),
  protocol: z.enum(['udp', 'tcp', 'internal']).optional(),
  search: z.string().trim().max(256).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const settingsSchema = z
  .object({
    enabled: z.boolean(),
    udpEnabled: z.boolean(),
    tcpEnabled: z.boolean(),
    bindAddress: z.string().trim().min(1).max(255),
    port: z.coerce.number().int().min(1).max(65535),
    retentionDays: z.coerce.number().int().min(1).max(3650),
    maxRecords: z.coerce.number().int().min(1000).max(10000000),
    acceptUnmatched: z.boolean(),
  })
  .refine((value) => !value.enabled || value.udpEnabled || value.tcpEnabled, {
    message: 'Enable UDP or TCP before starting the Syslog receiver.',
  });

const aliasSchema = z.object({
  alias: z.string().trim().min(1).max(255),
  deviceId: z.string().trim().min(1),
});

const configureSchema = z.object({
  deviceIds: z.array(z.string().min(1)).min(1).max(500),
  serverAddress: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[A-Za-z0-9_.:[\]-]+$/, 'Invalid Syslog server address')
    .refine(
      (value) => !['localhost', '127.0.0.1', '::1', '[::1]'].includes(value.toLowerCase()),
      'Use the LAN IP/hostname of the MME computer; localhost points to the router itself.',
    ),
  port: z.coerce.number().int().min(1).max(65535).default(514),
  topics: z.string().trim().min(1).max(512).default('info,!account,!debug'),
  confirm: z.literal(true),
});

export async function syslogRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/syslog/overview', { preHandler: readPreHandler }, async () => ({
    success: true,
    data: await syslogService.overview(),
  }));
  app.get('/api/v1/syslog/messages', { preHandler: readPreHandler }, async (request) => ({
    success: true,
    data: await syslogService.list(listQuerySchema.parse(request.query ?? {})),
  }));
  app.put('/api/v1/syslog/settings', { preHandler: managePreHandler }, async (request) => ({
    success: true,
    data: await syslogService.updateSettings(settingsSchema.parse(request.body ?? {})),
  }));
  app.post('/api/v1/syslog/test', { preHandler: managePreHandler }, async () => ({
    success: true,
    data: await syslogService.testReceiver(),
  }));
  app.post('/api/v1/syslog/aliases', { preHandler: managePreHandler }, async (request) => {
    const body = aliasSchema.parse(request.body ?? {});
    return { success: true, data: await syslogService.addAlias(body.alias, body.deviceId) };
  });
  app.delete('/api/v1/syslog/aliases/:id', { preHandler: managePreHandler }, async (request) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
    return { success: true, data: await syslogService.deleteAlias(id) };
  });
  app.post('/api/v1/syslog/purge', { preHandler: managePreHandler }, async () => ({
    success: true,
    data: await syslogService.purge(),
  }));
  app.post('/api/v1/syslog/clear', { preHandler: managePreHandler }, async (request) => {
    z.object({ confirm: z.literal(true) }).parse(request.body ?? {});
    return { success: true, data: await syslogService.clearAll() };
  });
  app.post(
    '/api/v1/syslog/routeros/configure',
    { preHandler: managePreHandler },
    async (request) => {
      const body = configureSchema.parse(request.body ?? {});
      const results = [];
      for (let index = 0; index < body.deviceIds.length; index += 5) {
        results.push(
          ...(await Promise.all(
            body.deviceIds
              .slice(index, index + 5)
              .map((deviceId) => syslogRouterOsService.configure(deviceId, body)),
          )),
        );
      }
      return {
        success: true,
        data: {
          results,
          succeeded: results.filter((item) => item.success).length,
          failed: results.filter((item) => !item.success).length,
        },
      };
    },
  );
}
