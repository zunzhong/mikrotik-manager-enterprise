import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { notificationService } from './notification.service.js';

const channelTypeValues = ['email', 'webhook', 'slack', 'telegram', 'in_app'] as const;
const severityValues = ['info', 'success', 'warning', 'critical'] as const;

const idParamsSchema = z.object({
  id: z.string().min(1),
});

const createChannelSchema = z.object({
  name: z.string().min(1),
  type: z.enum(channelTypeValues),
  enabled: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

const updateChannelSchema = z.object({
  name: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

const createRuleSchema = z.object({
  name: z.string().min(1),
  enabled: z.boolean().optional(),
  eventTypes: z.array(z.string().min(1)).min(1),
  severities: z.array(z.enum(severityValues)).min(1),
  channelIds: z.array(z.string().min(1)).min(1),
});

const updateRuleSchema = z.object({
  name: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  eventTypes: z.array(z.string().min(1)).min(1).optional(),
  severities: z.array(z.enum(severityValues)).min(1).optional(),
  channelIds: z.array(z.string().min(1)).min(1).optional(),
});

const listDeliveriesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(500).optional(),
});

const processPendingSchema = z.object({
  limit: z.coerce.number().int().positive().max(500).optional(),
});

const enqueueTestSchema = z.object({
  eventType: z.string().min(1).default('SYSTEM_EVENT'),
  severity: z.enum(severityValues).default('info'),
  title: z.string().min(1).default('Notification test'),
  message: z.string().min(1).default('This is a notification test payload.'),
  source: z.string().min(1).default('notification-api'),
  deviceId: z.string().optional(),
  deviceName: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/notifications/summary', async () => ({
    success: true,
    data: notificationService.summary(),
  }));

  app.get('/api/v1/notifications/channels', async () => ({
    success: true,
    data: notificationService.listChannels(),
  }));

  app.post('/api/v1/notifications/channels', async (request) => {
    const body = createChannelSchema.parse(request.body ?? {});

    return {
      success: true,
      data: notificationService.createChannel(body),
    };
  });

  app.patch('/api/v1/notifications/channels/:id', async (request, reply) => {
    const params = idParamsSchema.parse(request.params);
    const body = updateChannelSchema.parse(request.body ?? {});
    const channel = notificationService.updateChannel(params.id, body);

    if (!channel) {
      reply.code(404);
      return {
        success: false,
        error: 'Notification channel not found',
      };
    }

    return {
      success: true,
      data: channel,
    };
  });

  app.delete('/api/v1/notifications/channels/:id', async (request) => {
    const params = idParamsSchema.parse(request.params);

    return {
      success: true,
      data: notificationService.deleteChannel(params.id),
    };
  });

  app.get('/api/v1/notifications/rules', async () => ({
    success: true,
    data: notificationService.listRules(),
  }));

  app.post('/api/v1/notifications/rules', async (request) => {
    const body = createRuleSchema.parse(request.body ?? {});

    return {
      success: true,
      data: notificationService.createRule(body),
    };
  });

  app.patch('/api/v1/notifications/rules/:id', async (request, reply) => {
    const params = idParamsSchema.parse(request.params);
    const body = updateRuleSchema.parse(request.body ?? {});
    const rule = notificationService.updateRule(params.id, body);

    if (!rule) {
      reply.code(404);
      return {
        success: false,
        error: 'Notification rule not found',
      };
    }

    return {
      success: true,
      data: rule,
    };
  });

  app.delete('/api/v1/notifications/rules/:id', async (request) => {
    const params = idParamsSchema.parse(request.params);

    return {
      success: true,
      data: notificationService.deleteRule(params.id),
    };
  });

  app.get('/api/v1/notifications/deliveries', async (request) => {
    const query = listDeliveriesQuerySchema.parse(request.query);

    return {
      success: true,
      data: notificationService.listDeliveries(query.limit),
    };
  });

  app.post('/api/v1/notifications/deliveries/:id/retry', async (request) => {
    const params = idParamsSchema.parse(request.params);

    return {
      success: true,
      data: await notificationService.retryDelivery(params.id),
    };
  });

  app.post('/api/v1/notifications/process-pending', async (request) => {
    const body = processPendingSchema.parse(request.body ?? {});

    return {
      success: true,
      data: await notificationService.processPending(body.limit),
    };
  });

  app.post('/api/v1/notifications/retry-failed', async (request) => {
    const body = processPendingSchema.parse(request.body ?? {});

    return {
      success: true,
      data: await notificationService.retryFailed(body.limit),
    };
  });

  app.post('/api/v1/notifications/seed-defaults', async () => ({
    success: true,
    data: notificationService.seedDefaults(),
  }));

  app.post('/api/v1/notifications/test', async (request) => {
    const body = enqueueTestSchema.parse(request.body ?? {});
    const deliveries = notificationService.enqueue({
      eventType: body.eventType,
      severity: body.severity,
      title: body.title,
      message: body.message,
      source: body.source,
      deviceId: body.deviceId,
      deviceName: body.deviceName,
      metadata: body.metadata,
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      data: {
        queued: deliveries.length,
        deliveries,
      },
    };
  });
}
