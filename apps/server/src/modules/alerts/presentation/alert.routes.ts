import type { FastifyInstance } from 'fastify';
import { alertService } from '../application/alert.service.js';

export async function alertRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/alerts/rules', async () => ({
    success: true,
    data: alertService.listRules(),
  }));

  app.get('/api/v1/alerts', async () => ({
    success: true,
    data: await alertService.list(),
  }));

  app.patch('/api/v1/alerts/:id/ack', async (request) => {
    const params = request.params as { id: string };

    return {
      success: true,
      data: await alertService.acknowledge(params.id),
    };
  });
}
