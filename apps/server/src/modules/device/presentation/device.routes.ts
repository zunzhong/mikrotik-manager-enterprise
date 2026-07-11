import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { attachAuthContextPreHandler } from '../../auth/auth.context.middleware.js';
import { rbacAnyGuard, rbacGuard } from '../../rbac/rbac.guard.js';
import type { RbacPermission } from '../../rbac/rbac.types.js';
import { deviceRealtimeSchedulerService } from '../application/device-realtime-scheduler.service.js';
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

const schedulerStartSchema = z.object({
  intervalMs: z.coerce.number().int().min(3000).max(300000).optional(),
  ttlMs: z.coerce.number().int().min(1000).max(600000).optional(),
});

const deviceManagePreHandler = [attachAuthContextPreHandler, rbacGuard('device:manage')];

const deviceConnectionTestPreHandler = [
  attachAuthContextPreHandler,
  rbacAnyGuard(
    ['device:connect', 'device:test', 'device:manage'] as RbacPermission[],
    'Device connection test permission is required',
  ),
];

const deviceSyncPreHandler = [
  attachAuthContextPreHandler,
  rbacAnyGuard(
    ['device:sync', 'device:manage'] as RbacPermission[],
    'Device sync permission is required',
  ),
];

const deviceSafeActionPreHandler = [
  attachAuthContextPreHandler,
  rbacAnyGuard(
    ['device:test', 'device:connect', 'device:manage'] as RbacPermission[],
    'Device action test permission is required',
  ),
];

const deviceFileActionPreHandler = [
  attachAuthContextPreHandler,
  rbacAnyGuard(
    ['device:sync', 'device:manage'] as RbacPermission[],
    'Device file action permission is required',
  ),
];

function ssePayload(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function deviceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/devices', async () => ({
    success: true,
    data: await deviceService.list(),
  }));

  app.post(
    '/api/v1/devices/test',
    {
      preHandler: deviceConnectionTestPreHandler,
    },
    async (request) => {
      const input = testDeviceConnectionSchema.parse(request.body);

      return {
        success: true,
        data: await deviceTestService.test(input),
      };
    },
  );

  app.get('/api/v1/realtime/devices', async () => ({
    success: true,
    data: {
      scheduler: deviceRealtimeSchedulerService.status(),
      devices: deviceRealtimeSchedulerService.cachedDevices(),
    },
  }));

  app.get('/api/v1/realtime/scheduler/status', async () => ({
    success: true,
    data: deviceRealtimeSchedulerService.status(),
  }));

  app.post(
    '/api/v1/realtime/scheduler/start',
    {
      preHandler: deviceSyncPreHandler,
    },
    async (request) => ({
      success: true,
      data: deviceRealtimeSchedulerService.start(schedulerStartSchema.parse(request.body ?? {})),
    }),
  );

  app.post(
    '/api/v1/realtime/scheduler/stop',
    {
      preHandler: deviceSyncPreHandler,
    },
    async () => ({
      success: true,
      data: deviceRealtimeSchedulerService.stop(),
    }),
  );

  app.get('/api/v1/realtime/devices/:id', async (request) => {
    const params = deviceIdParamsSchema.parse(request.params);

    return {
      success: true,
      data: await deviceRealtimeService.getSnapshot(params.id),
    };
  });

  app.post(
    '/api/v1/realtime/devices/:id/refresh',
    {
      preHandler: deviceSyncPreHandler,
    },
    async (request) => {
      const params = deviceIdParamsSchema.parse(request.params);

      return {
        success: true,
        data: await deviceRealtimeService.refreshSnapshot(params.id),
      };
    },
  );

  app.get('/api/v1/realtime/devices/:id/stream', async (request, reply) => {
    const params = deviceIdParamsSchema.parse(request.params);
    let closed = false;

    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const send = (event: string, data: unknown) => {
      if (!closed) {
        reply.raw.write(ssePayload(event, data));
      }
    };

    const pushSnapshot = async () => {
      try {
        const [snapshot, scheduler] = await Promise.all([
          deviceRealtimeService.getSnapshot(params.id),
          Promise.resolve(deviceRealtimeSchedulerService.status()),
        ]);
        send('snapshot', snapshot);
        send('scheduler', scheduler);
      } catch (error) {
        send('error', {
          message: error instanceof Error ? error.message : 'Realtime stream failed',
          at: new Date().toISOString(),
        });
      }
    };

    const timer = setInterval(() => {
      void pushSnapshot();
    }, 5000);

    const heartbeat = setInterval(() => {
      if (!closed) {
        reply.raw.write(': heartbeat\n\n');
      }
    }, 15000);

    request.raw.on('close', () => {
      closed = true;
      clearInterval(timer);
      clearInterval(heartbeat);
      reply.raw.end();
    });

    await pushSnapshot();
  });

  app.get('/api/v1/devices/:id', async (request) => {
    const params = deviceIdParamsSchema.parse(request.params);

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
      const params = deviceIdParamsSchema.parse(request.params);
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
      const params = deviceIdParamsSchema.parse(request.params);

      return {
        success: true,
        data: await deviceService.delete(params.id),
      };
    },
  );

  app.get('/api/v1/devices/:id/realtime', async (request) => {
    const params = deviceIdParamsSchema.parse(request.params);

    return {
      success: true,
      data: await deviceRealtimeService.getSnapshot(params.id),
    };
  });

  app.post(
    '/api/v1/devices/:id/realtime/refresh',
    {
      preHandler: deviceSyncPreHandler,
    },
    async (request) => {
      const params = deviceIdParamsSchema.parse(request.params);

      return {
        success: true,
        data: await deviceRealtimeService.refreshSnapshot(params.id),
      };
    },
  );

  app.post(
    '/api/v1/devices/:id/actions/ping',
    {
      preHandler: deviceSafeActionPreHandler,
    },
    async (request) => {
      const params = deviceIdParamsSchema.parse(request.params);
      const input = pingActionSchema.parse(request.body ?? {});

      return {
        success: true,
        data: await routerOsDeviceActionService.ping(params.id, input),
      };
    },
  );

  app.post(
    '/api/v1/devices/:id/actions/backup',
    {
      preHandler: deviceFileActionPreHandler,
    },
    async (request) => {
      const params = deviceIdParamsSchema.parse(request.params);
      const input = fileActionSchema.parse(request.body ?? {});

      return {
        success: true,
        data: await routerOsDeviceActionService.backup(params.id, input),
      };
    },
  );

  app.post(
    '/api/v1/devices/:id/actions/supout',
    {
      preHandler: deviceFileActionPreHandler,
    },
    async (request) => {
      const params = deviceIdParamsSchema.parse(request.params);
      const input = fileActionSchema.parse(request.body ?? {});

      return {
        success: true,
        data: await routerOsDeviceActionService.supout(params.id, input),
      };
    },
  );

  app.post(
    '/api/v1/devices/:id/actions/reboot',
    {
      preHandler: deviceManagePreHandler,
    },
    async (request) => {
      const params = deviceIdParamsSchema.parse(request.params);
      const input = rebootActionSchema.parse(request.body ?? {});

      return {
        success: true,
        data: await routerOsDeviceActionService.reboot(params.id, input),
      };
    },
  );
}
