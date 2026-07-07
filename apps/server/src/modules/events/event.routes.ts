import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eventBus } from './event-bus.js';
import { eventStore } from './event.store.js';

const eventQuerySchema = z.object({
  deviceId: z.string().optional(),
  severity: z.enum(['info', 'success', 'warning', 'critical']).optional(),
  type: z.string().optional(),
  limit: z.coerce.number().int().positive().max(1000).optional(),
});

const testEventSchema = z.object({
  message: z.string().min(1).optional().default('Event bus test event'),
  severity: z.enum(['info', 'success', 'warning', 'critical']).optional().default('info'),
});

export async function eventRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/events', async (request) => {
    const query = eventQuerySchema.parse(request.query);

    return {
      success: true,
      data: eventStore.list({
        deviceId: query.deviceId,
        severity: query.severity,
        type: query.type as never,
        limit: query.limit,
      }),
    };
  });

  app.get('/api/v1/events/recent', async () => ({
    success: true,
    data: eventStore.recent(),
  }));

  app.post('/api/v1/events/test', async (request) => {
    const input = testEventSchema.parse(request.body ?? {});

    return {
      success: true,
      data: eventBus.publish({
        type: 'SYSTEM_EVENT',
        severity: input.severity,
        title: 'Event Bus Test',
        message: input.message,
        source: 'manual-test',
      }),
    };
  });
}
