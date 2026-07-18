import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { topologyService } from '../application/topology.service.js';
import { inventorySchedulerService } from '../../inventory/application/inventory-scheduler.service.js';

const deviceParamsSchema = z.object({ deviceId: z.string().min(1) });
const manualLinkParamsSchema = z.object({ id: z.string().min(1) });
const historyQuerySchema = z.object({
  deviceId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(30),
});
const layoutSchema = z.object({
  deviceId: z.string().min(1).optional(),
  positions: z
    .array(
      z.object({
        nodeId: z.string().min(1),
        x: z.number().finite().min(-100000).max(100000),
        y: z.number().finite().min(-100000).max(100000),
      }),
    )
    .max(2000),
});
const manualLinkSchema = z.object({
  sourceNodeId: z.string().min(1),
  targetNodeId: z.string().min(1),
  label: z.string().trim().max(100).optional(),
});

function withScheduler<T extends Record<string, unknown>>(data: T) {
  return { ...data, inventoryScheduler: inventorySchedulerService.status() };
}

export async function topologyRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/topology', async () => ({
    success: true,
    data: withScheduler(await topologyService.getTopology()),
  }));

  app.get('/api/v1/topology/devices/:deviceId', async (request) => {
    const { deviceId } = deviceParamsSchema.parse(request.params);
    return {
      success: true,
      data: withScheduler(await topologyService.getTopology(deviceId)),
    };
  });

  app.get('/api/v1/topology/history', async (request) => {
    const query = historyQuerySchema.parse(request.query ?? {});
    return { success: true, data: await topologyService.history(query.deviceId, query.limit) };
  });

  app.post('/api/v1/topology/refresh', async () => {
    await inventorySchedulerService.runOnce('topology');
    const captured = await topologyService.capture();
    return {
      success: true,
      data: withScheduler({
        ...captured.topology,
        historyCapture: { captured: captured.captured, graphHash: captured.graphHash },
      }),
    };
  });

  app.post('/api/v1/topology/devices/:deviceId/refresh', async (request) => {
    const { deviceId } = deviceParamsSchema.parse(request.params);
    await inventorySchedulerService.runDevice(deviceId, 'topology');
    await topologyService.capture();
    const captured = await topologyService.capture(deviceId);
    return {
      success: true,
      data: withScheduler({
        ...captured.topology,
        historyCapture: { captured: captured.captured, graphHash: captured.graphHash },
      }),
    };
  });

  app.put('/api/v1/topology/layout', async (request) => {
    const body = layoutSchema.parse(request.body ?? {});
    return {
      success: true,
      data: await topologyService.saveLayout(body.deviceId, body.positions),
    };
  });

  app.post('/api/v1/topology/links/manual', async (request) => ({
    success: true,
    data: await topologyService.createManualLink(manualLinkSchema.parse(request.body ?? {})),
  }));

  app.delete('/api/v1/topology/links/manual/:id', async (request) => {
    const { id } = manualLinkParamsSchema.parse(request.params);
    return { success: true, data: await topologyService.deleteManualLink(id) };
  });
}
