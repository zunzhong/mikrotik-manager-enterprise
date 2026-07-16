import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { alertService } from '../application/alert.service.js';

const evaluateAlertsSchema = z.object({
  staleSnapshotHours: z.coerce.number().int().positive().default(24),
  lowComplianceThreshold: z.coerce.number().int().min(0).max(100).default(80),
  createAlerts: z.boolean().default(true),
});
const deviceRuleParamsSchema = z.object({ id: z.string().min(1), ruleKey: z.string().min(1) });
const deviceRuleSchema = z.object({
  enabled: z.boolean(),
  channelIds: z.array(z.string().min(1)).max(100).optional(),
  notifyAllChannels: z.boolean().optional(),
});
const alertParamsSchema = z.object({ id: z.string().min(1) });
const deleteAlertsQuerySchema = z.object({ deviceId: z.string().min(1).optional() });

export async function alertRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/alerts/rules', async () => ({
    success: true,
    data: alertService.listRules(),
  }));

  app.get('/api/v1/devices/:id/alerts/rules', async (request) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
    return { success: true, data: await alertService.listDeviceRules(id) };
  });

  app.put('/api/v1/devices/:id/alerts/rules/:ruleKey', async (request) => {
    const { id, ruleKey } = deviceRuleParamsSchema.parse(request.params);
    const body = deviceRuleSchema.parse(request.body);
    return { success: true, data: await alertService.configureDeviceRule(id, ruleKey, body) };
  });

  app.delete('/api/v1/devices/:id/alerts/rules/:ruleKey', async (request) => {
    const { id, ruleKey } = deviceRuleParamsSchema.parse(request.params);
    return { success: true, data: await alertService.removeDeviceRuleConfig(id, ruleKey) };
  });

  app.get('/api/v1/alerts', async () => ({
    success: true,
    data: await alertService.list(),
  }));

  app.delete('/api/v1/alerts', async (request) => {
    const { deviceId } = deleteAlertsQuerySchema.parse(request.query ?? {});
    return { success: true, data: await alertService.deleteAll(deviceId) };
  });

  app.post('/api/v1/alerts/evaluate', async (request, reply) => {
    const body = evaluateAlertsSchema.parse(request.body ?? {});

    return reply.status(202).send({
      success: true,
      data: await alertService.evaluate(body),
    });
  });

  app.post('/api/v1/devices/:id/alerts/evaluate', async (request, reply) => {
    const params = request.params as { id: string };
    const body = evaluateAlertsSchema.parse(request.body ?? {});

    return reply.status(202).send({
      success: true,
      data: await alertService.evaluate({
        ...body,
        deviceId: params.id,
      }),
    });
  });

  app.patch('/api/v1/alerts/:id/ack', async (request) => {
    const params = request.params as { id: string };

    return {
      success: true,
      data: await alertService.acknowledge(params.id),
    };
  });

  app.patch('/api/v1/alerts/:id/resolve', async (request) => {
    const params = request.params as { id: string };
    return { success: true, data: await alertService.resolve(params.id) };
  });

  app.delete('/api/v1/alerts/:id', async (request) => {
    const { id } = alertParamsSchema.parse(request.params);
    return { success: true, data: await alertService.delete(id) };
  });
}
