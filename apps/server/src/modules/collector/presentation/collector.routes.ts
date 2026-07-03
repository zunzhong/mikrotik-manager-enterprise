import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { collectorService } from '../application/collector.service.js';

const enqueueCollectorSchema = z.object({
  mode: z.enum(['full', 'quick']).default('full'),
});

export async function collectorRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/collector/plans', async () => {
    return {
      success: true,
      data: collectorService.listPlans(),
    };
  });

  app.post('/api/v1/devices/:id/collector/inventory', async (request, reply) => {
    const params = request.params as { id: string };
    const body = enqueueCollectorSchema.parse(request.body ?? {});

    const job = await collectorService.enqueueInventory(params.id, body.mode);

    return reply.status(202).send({
      success: true,
      data: job,
    });
  });
}
