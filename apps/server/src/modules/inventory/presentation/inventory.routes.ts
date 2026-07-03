import type { FastifyInstance } from 'fastify';
import { inventoryCollectorService } from '../application/inventory-collector.service.js';
import { inventoryDiffService } from '../application/inventory-diff.service.js';
import { inventoryService } from '../application/inventory.service.js';

export async function inventoryRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/inventory/sections', async () => {
    return {
      success: true,
      data: inventoryService.listSections(),
    };
  });

  app.get('/api/v1/devices/:id/inventory/snapshots', async (request) => {
    const params = request.params as { id: string };

    return {
      success: true,
      data: await inventoryService.listSnapshots(params.id),
    };
  });

  app.post('/api/v1/devices/:id/inventory/collect', async (request, reply) => {
    const params = request.params as { id: string };

    return reply.status(202).send({
      success: true,
      data: await inventoryCollectorService.collect(params.id),
    });
  });

  app.get('/api/v1/devices/:id/inventory/diffs', async (request) => {
    const params = request.params as { id: string };

    return {
      success: true,
      data: await inventoryDiffService.list(params.id),
    };
  });

  app.post('/api/v1/devices/:id/inventory/diff-latest', async (request, reply) => {
    const params = request.params as { id: string };

    return reply.status(202).send({
      success: true,
      data: await inventoryDiffService.diffLatest(params.id),
    });
  });
}
