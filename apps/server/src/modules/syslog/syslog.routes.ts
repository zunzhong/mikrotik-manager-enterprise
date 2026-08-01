import type { FastifyInstance, FastifyRequest } from 'fastify';
import { DateTime } from 'luxon';
import { z } from 'zod';
import { HttpError } from '../../errors/http-error.js';
import {
  attachAuthContextPreHandler,
  getRequiredAuthContext,
} from '../auth/auth.context.middleware.js';
import { auditService, type CreateAuditEventInput } from '../audit/index.js';
import { rbacGuard } from '../rbac/rbac.guard.js';
import { systemPreferencesService } from '../system/application/system-preferences.service.js';
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
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const dailyFileParamsSchema = z.object({
  deviceId: z.string().trim().min(1).max(255),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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

function requestAuditActor(request: FastifyRequest) {
  const principal = getRequiredAuthContext(request).principal;
  return {
    type: 'user' as const,
    id: principal?.userId ?? 'unknown-user',
    name: principal?.name ?? principal?.email ?? principal?.userId ?? 'Unknown user',
    ip: request.ip,
    userAgent: request.headers['user-agent'],
  };
}

function parseListQuery(query: unknown) {
  const parsed = listQuerySchema.parse(query ?? {});
  const { date, ...result } = parsed;
  if (!date) return result;
  const zone = systemPreferencesService.get().timeZone;
  const day = DateTime.fromISO(date, { zone });
  if (!day.isValid) throw new HttpError(400, 'SYSLOG_DATE_INVALID', 'Invalid Syslog date.');
  return {
    ...result,
    from: day.startOf('day').toUTC().toJSDate(),
    to: day.endOf('day').toUTC().toJSDate(),
  };
}

async function recordSyslogAudit(
  request: FastifyRequest,
  input: Omit<CreateAuditEventInput, 'actor'>,
): Promise<void> {
  try {
    await auditService.record({
      ...input,
      actor: requestAuditActor(request),
      entity: input.entity ?? {
        type: 'config',
        id: 'syslog-server',
        name: 'Syslog Server',
      },
    });
  } catch (error) {
    request.log.warn({ err: error, action: input.action }, 'Unable to persist Syslog audit event');
  }
}

export async function syslogRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/syslog/overview', { preHandler: readPreHandler }, async () => ({
    success: true,
    data: await syslogService.overview(),
  }));
  app.get('/api/v1/syslog/messages', { preHandler: readPreHandler }, async (request) => ({
    success: true,
    data: await syslogService.list(parseListQuery(request.query)),
  }));
  app.get(
    '/api/v1/syslog/files/:deviceId/:date/download',
    { preHandler: readPreHandler },
    async (request, reply) => {
      const { deviceId, date } = dailyFileParamsSchema.parse(request.params);
      const file = await syslogService.dailyFile(deviceId, date);
      if (!file) {
        throw new HttpError(
          404,
          'SYSLOG_DAILY_FILE_NOT_FOUND',
          `No daily Syslog file exists for ${date}.`,
        );
      }
      return reply
        .type('text/plain; charset=utf-8')
        .header('Content-Length', file.size)
        .header('Content-Disposition', `attachment; filename="${file.fileName}"`)
        .send(file.content);
    },
  );
  app.put('/api/v1/syslog/settings', { preHandler: managePreHandler }, async (request) => {
    const settings = settingsSchema.parse(request.body ?? {});
    try {
      const result = await syslogService.updateSettings(settings);
      request.log.info(
        {
          action: 'syslog.server.settings_updated',
          actorId: requestAuditActor(request).id,
          settings: result.settings,
          receiver: result.receiver,
        },
        'Syslog server configuration updated manually',
      );
      await recordSyslogAudit(request, {
        action: 'syslog.server.settings_updated',
        summary: `Updated Syslog server listener to ${result.settings.bindAddress}:${result.settings.port}`,
        status: 'success',
        metadata: {
          settings: result.settings,
          receiver: result.receiver,
          source: 'manual-ui',
        },
      });
      return { success: true, data: result };
    } catch (error) {
      request.log.warn(
        {
          err: error,
          action: 'syslog.server.settings_update_failed',
          actorId: requestAuditActor(request).id,
          requestedSettings: settings,
        },
        'Manual Syslog server configuration failed',
      );
      await recordSyslogAudit(request, {
        action: 'syslog.server.settings_update_failed',
        summary: `Failed to update Syslog server listener to ${settings.bindAddress}:${settings.port}`,
        severity: 'warning',
        status: 'failure',
        metadata: {
          requestedSettings: settings,
          error: error instanceof Error ? error.message : String(error),
          source: 'manual-ui',
        },
      });
      throw error;
    }
  });
  app.post('/api/v1/syslog/test', { preHandler: managePreHandler }, async (request) => {
    const result = await syslogService.testReceiver();
    await recordSyslogAudit(request, {
      action: result.success ? 'syslog.server.test_succeeded' : 'syslog.server.test_failed',
      summary: result.message,
      severity: result.success ? 'info' : 'warning',
      status: result.success ? 'success' : 'failure',
      metadata: { receiver: result.receiver, source: 'manual-ui' },
    });
    return { success: true, data: result };
  });
  app.post('/api/v1/syslog/aliases', { preHandler: managePreHandler }, async (request) => {
    const body = aliasSchema.parse(request.body ?? {});
    const result = await syslogService.addAlias(body.alias, body.deviceId);
    await recordSyslogAudit(request, {
      action: 'syslog.source_alias.saved',
      summary: `Saved Syslog source alias ${body.alias}`,
      status: 'success',
      entity: { type: 'device', id: body.deviceId },
      metadata: { alias: body.alias, source: 'manual-ui' },
    });
    return { success: true, data: result };
  });
  app.delete('/api/v1/syslog/aliases/:id', { preHandler: managePreHandler }, async (request) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
    const result = await syslogService.deleteAlias(id);
    await recordSyslogAudit(request, {
      action: 'syslog.source_alias.deleted',
      summary: `Deleted Syslog source alias ${id}`,
      status: 'success',
      metadata: { aliasId: id, source: 'manual-ui' },
    });
    return { success: true, data: result };
  });
  app.post('/api/v1/syslog/purge', { preHandler: managePreHandler }, async (request) => {
    const result = await syslogService.purge();
    await recordSyslogAudit(request, {
      action: 'syslog.storage.purged',
      summary: `Purged ${result.total} expired or overflow Syslog records`,
      status: 'success',
      metadata: { ...result, source: 'manual-ui' },
    });
    return { success: true, data: result };
  });
  app.post('/api/v1/syslog/clear', { preHandler: managePreHandler }, async (request) => {
    z.object({ confirm: z.literal(true) }).parse(request.body ?? {});
    const result = await syslogService.clearAll();
    await recordSyslogAudit(request, {
      action: 'syslog.storage.cleared',
      summary: `Deleted all ${result.deleted} stored Syslog records`,
      severity: 'warning',
      status: 'success',
      metadata: { ...result, source: 'manual-ui' },
    });
    return { success: true, data: result };
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
              .map((deviceId) =>
                syslogRouterOsService.configure(deviceId, body, (marker) =>
                  syslogService.waitForStoredMessage(marker),
                ),
              ),
          )),
        );
      }
      const succeeded = results.filter((item) => item.success).length;
      const failed = results.filter((item) => !item.success).length;
      const logContext = {
        action: failed > 0 ? 'syslog.routeros.configuration_partial' : 'syslog.routeros.configured',
        actorId: requestAuditActor(request).id,
        serverAddress: body.serverAddress,
        port: body.port,
        topics: body.topics,
        succeeded,
        failed,
        results,
      };
      if (failed > 0) {
        request.log.warn(logContext, 'RouterOS Syslog configuration completed with failures');
      } else {
        request.log.info(logContext, 'RouterOS Syslog configuration completed');
      }
      await recordSyslogAudit(request, {
        action: failed > 0 ? 'syslog.routeros.configuration_partial' : 'syslog.routeros.configured',
        summary: `Configured RouterOS Syslog on ${succeeded}/${results.length} devices`,
        severity: failed > 0 ? 'warning' : 'info',
        status: failed > 0 ? 'failure' : 'success',
        entity: { type: 'config', id: 'routeros-syslog', name: 'RouterOS Syslog' },
        metadata: {
          serverAddress: body.serverAddress,
          port: body.port,
          topics: body.topics,
          deviceIds: body.deviceIds,
          succeeded,
          failed,
          results,
          source: 'manual-ui',
        },
      });
      return {
        success: true,
        data: {
          results,
          succeeded,
          failed,
        },
      };
    },
  );
}
