import type { FastifyInstance } from 'fastify';
import { attachAuthContextPreHandler } from '../../auth/auth.context.middleware.js';
import { rbacGuard } from '../../rbac/rbac.guard.js';
import { deviceService } from '../application/device.service.js';
import { deviceTestService } from '../application/device-test.service.js';
import {
  createDeviceSchema,
  testDeviceConnectionSchema,
  updateDeviceSchema,
} from './device.schemas.js';

const deviceManagePreHandler = [attachAuthContextPreHandler, rbacGuard('device:manage')];

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
    const params = request.params as { id: string };

    return {
      success: true,
      data: await deviceService.get(params.id),
    };
  });

  app.post(
    '/api/v1/devices',
    {
      preHandler: deviceManagePreHandler,
    },
    async (request, reply) => {
      const input = createDeviceSchema.parse(request.body);
      const device = await deviceService.create(input);

      return reply.status(201).send({
        success: true,
        data: device,
      });
    },
  );

  app.patch(
    '/api/v1/devices/:id',
    {
      preHandler: deviceManagePreHandler,
    },
    async (request) => {
      const params = request.params as { id: string };
      const input = updateDeviceSchema.parse(request.body);

      return {
        success: true,
        data: await deviceService.update(params.id, input),
      };
    },
  );

  app.delete(
    '/api/v1/devices/:id',
    {
      preHandler: deviceManagePreHandler,
    },
    async (request) => {
      const params = request.params as { id: string };

      return {
        success: true,
        data: await deviceService.delete(params.id),
      };
    },
  );
}
