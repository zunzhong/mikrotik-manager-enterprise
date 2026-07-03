import type { FastifyInstance } from 'fastify';
import { deviceService } from '../application/device.service.js';
import { createDeviceSchema, updateDeviceSchema } from './device.schemas.js';

export async function deviceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/devices', async () => ({
    success: true,
    data: await deviceService.list(),
  }));

  app.get('/api/v1/devices/:id', async (request) => {
    const params = request.params as { id: string };
    return { success: true, data: await deviceService.get(params.id) };
  });

  app.post('/api/v1/devices', async (request, reply) => {
    const input = createDeviceSchema.parse(request.body);
    const device = await deviceService.create(input);
    return reply.status(201).send({ success: true, data: device });
  });

  app.patch('/api/v1/devices/:id', async (request) => {
    const params = request.params as { id: string };
    const input = updateDeviceSchema.parse(request.body);
    return { success: true, data: await deviceService.update(params.id, input) };
  });

  app.delete('/api/v1/devices/:id', async (request) => {
    const params = request.params as { id: string };
    return { success: true, data: await deviceService.delete(params.id) };
  });
}
