import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { deviceRealtimeService } from '../application/device-realtime.service.js';
import { deviceService } from '../application/device.service.js';
import { deviceTestService } from '../application/device-test.service.js';
import { routerOsDeviceActionService } from '../application/routeros-device-action.service.js';
import {
  createDeviceSchema,
  testDeviceConnectionSchema,
  updateDeviceSchema,
} from './device.schemas.js';

const deviceIdParamsSchema = z.object({
  id: z.string().min(1),
});

const pingActionSchema = z.object({
  address: z.string().min(1).optional().default('8.8.8.8'),
  count: z.coerce.number().int().positive().max(20).optional().default(4),
});

const fileActionSchema = z.object({
  name: z.string().min(1).optional(),
});

const rebootActionSchema = z.object({
  confirm: z.boolean(),
});

export async function deviceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/devices', async () => ({
    success: true,
    data: await deviceService.list(),
  }));

  app.post('/api/v1/devices/test', async (request) => {
    const input = testDeviceConnectionSchema.parse(request.body);

    return {
      success: true,
      data: await deviceTestService.test(input),
    };
  });

  app.get('/api/v1/devices/:id', async (request) => {
    const params = deviceIdParamsSchema.parse(request.params);
    return { success: true, data: await deviceService.get(params.id) };
  });

  app.post('/api/v1/devices', async (request, reply) => {
    const input = createDeviceSchema.parse(request.body);
    const device = await deviceService.create(input);
    return reply.status(201).send({ success: true, data: device });
  });

  app.patch('/api/v1/devices/:id', async (request) => {
    const params = deviceIdParamsSchema.parse(request.params);
    const input = updateDeviceSchema.parse(request.body);
    return { success: true, data: await deviceService.update(params.id, input) };
  });

  app.delete('/api/v1/devices/:id', async (request) => {
    const params = deviceIdParamsSchema.parse(request.params);
    return { success: true, data: await deviceService.delete(params.id) };
  });

  app.get('/api/v1/devices/:id/realtime', async (request) => {
    const params = deviceIdParamsSchema.parse(request.params);

    return {
      success: true,
      data: await deviceRealtimeService.getSnapshot(params.id),
    };
  });

  app.post('/api/v1/devices/:id/realtime/refresh', async (request) => {
    const params = deviceIdParamsSchema.parse(request.params);

    return {
      success: true,
      data: await deviceRealtimeService.refreshSnapshot(params.id),
    };
  });

  app.post('/api/v1/devices/:id/actions/ping', async (request) => {
    const params = deviceIdParamsSchema.parse(request.params);
    const input = pingActionSchema.parse(request.body ?? {});

    return {
      success: true,
      data: await routerOsDeviceActionService.ping(params.id, input),
    };
  });

  app.post('/api/v1/devices/:id/actions/backup', async (request) => {
    const params = deviceIdParamsSchema.parse(request.params);
    const input = fileActionSchema.parse(request.body ?? {});

    return {
      success: true,
      data: await routerOsDeviceActionService.backup(params.id, input),
    };
  });

  app.post('/api/v1/devices/:id/actions/supout', async (request) => {
    const params = deviceIdParamsSchema.parse(request.params);
    const input = fileActionSchema.parse(request.body ?? {});

    return {
      success: true,
      data: await routerOsDeviceActionService.supout(params.id, input),
    };
  });

  app.post('/api/v1/devices/:id/actions/reboot', async (request) => {
    const params = deviceIdParamsSchema.parse(request.params);
    const input = rebootActionSchema.parse(request.body ?? {});

    return {
      success: true,
      data: await routerOsDeviceActionService.reboot(params.id, input),
    };
  });
}
