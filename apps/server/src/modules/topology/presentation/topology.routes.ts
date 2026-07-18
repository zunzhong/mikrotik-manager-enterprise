import type { FastifyInstance } from 'fastify';
import { topologyService } from '../application/topology.service.js';
import { inventorySchedulerService } from '../../inventory/application/inventory-scheduler.service.js';

export async function topologyRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/topology', async () => ({
    success: true,
    data: {
      ...(await topologyService.getTopology()),
      inventoryScheduler: inventorySchedulerService.status(),
    },
  }));

  app.post('/api/v1/topology/refresh', async () => {
    await inventorySchedulerService.runOnce('topology');
    return {
      success: true,
      data: {
        ...(await topologyService.getTopology()),
        inventoryScheduler: inventorySchedulerService.status(),
      },
    };
  });

  app.post('/api/v1/topology/devices/:deviceId/refresh', async (request) => {
    const { deviceId } = request.params as { deviceId: string };
    await inventorySchedulerService.runDevice(deviceId, 'topology');
    return {
      success: true,
      data: {
        ...(await topologyService.getTopology()),
        inventoryScheduler: inventorySchedulerService.status(),
      },
    };
  });
}
