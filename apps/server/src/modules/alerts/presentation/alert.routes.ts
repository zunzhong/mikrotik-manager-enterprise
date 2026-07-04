import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { alertService } from '../application/alert.service.js';

const evaluateAlertsSchema = z.object({
  staleSnapshotHours: z.coerce.number().int().positive().default(24),
  lowComplianceThreshold: z.coerce.number().int().min(0).max(100).default(80),
  createAlerts: z.boolean().default(true),
});

export async function alertRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/alerts/rules', async () => ({
    success: true,
    data: alertService.listRules(),
  }));

  app.get('/api/v1/alerts', async () => ({
    success: true,
    data: await alertService.list(),
  }));

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
}
