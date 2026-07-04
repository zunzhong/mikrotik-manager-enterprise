import type { FastifyInstance } from 'fastify';
import { inventoryCollectorService } from '../application/inventory-collector.service.js';
import { inventoryDiffService } from '../application/inventory-diff.service.js';
import { inventoryService } from '../application/inventory.service.js';
import { inventorySnapshotService } from '../application/inventory-snapshot.service.js';

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
      data: await inventorySnapshotService.list(params.id),
    };
  });

  app.get('/api/v1/devices/:id/inventory/snapshots/latest', async (request) => {
    const params = request.params as { id: string };

    return {
      success: true,
      data: await inventorySnapshotService.latest(params.id),
    };
  });

  app.get('/api/v1/inventory/snapshots/:snapshotId', async (request) => {
    const params = request.params as { snapshotId: string };

    return {
      success: true,
      data: await inventorySnapshotService.get(params.snapshotId),
    };
  });

  app.get('/api/v1/inventory/snapshots/:snapshotId/sections', async (request) => {
    const params = request.params as { snapshotId: string };

    return {
      success: true,
      data: await inventorySnapshotService.sections(params.snapshotId),
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

  app.get('/api/v1/inventory/diffs/:diffId', async (request) => {
    const params = request.params as { diffId: string };

    return {
      success: true,
      data: await inventoryDiffService.get(params.diffId),
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
