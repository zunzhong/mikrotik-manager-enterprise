import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { HttpError } from '../../errors/http-error.js';
import { alertLifecycleService } from './alert-lifecycle.service.js';
import type { AlertLifecycleSeverity, AlertLifecycleStatus } from './alert-lifecycle.types.js';

const statusValues = ['open', 'acknowledged', 'resolved'] as const;
const severityValues = ['info', 'warning', 'critical'] as const;

const listQuerySchema = z.object({
  deviceId: z.string().optional(),
  ruleKey: z.string().optional(),
  status: z.string().optional(),
  severity: z.string().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

const alertParamsSchema = z.object({
  id: z.string().min(1),
});

const actionBodySchema = z.object({
  reason: z.string().min(1).optional(),
});

function splitEnum<T extends readonly string[]>(
  value: string | undefined,
  allowed: T,
): T[number][] | undefined {
  if (!value) return undefined;

  const allowedSet = new Set<string>(allowed);

  const values = value
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is T[number] => allowedSet.has(item));

  return values.length > 0 ? values : undefined;
}

export async function alertLifecycleRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/alert-lifecycle/summary', async () => ({
    success: true,
    data: await alertLifecycleService.summary(),
  }));

  app.get('/api/v1/alert-lifecycle', async (request) => {
    const query = listQuerySchema.parse(request.query);

    return {
      success: true,
      data: await alertLifecycleService.list({
        deviceId: query.deviceId,
        ruleKey: query.ruleKey,
        statuses: splitEnum(query.status, statusValues) as AlertLifecycleStatus[] | undefined,
        severities: splitEnum(query.severity, severityValues) as AlertLifecycleSeverity[] | undefined,
        limit: query.limit,
      }),
    };
  });

  app.get('/api/v1/alert-lifecycle/active', async () => ({
    success: true,
    data: await alertLifecycleService.listActive(),
  }));

  app.get('/api/v1/alert-lifecycle/:id', async (request) => {
    const params = alertParamsSchema.parse(request.params);
    const alert = await alertLifecycleService.getById(params.id);

    if (!alert) {
      throw new HttpError(404, 'ALERT_NOT_FOUND', 'Alert not found');
    }

    return {
      success: true,
      data: alert,
    };
  });

  app.post('/api/v1/alert-lifecycle/:id/acknowledge', async (request) => {
    const params = alertParamsSchema.parse(request.params);
    const body = actionBodySchema.parse(request.body ?? {});
    const alert = await alertLifecycleService.acknowledge(params.id, {
      reason: body.reason ?? 'Acknowledged manually',
      metadata: {
        action: 'manual_acknowledge',
      },
    });

    if (!alert) {
      throw new HttpError(404, 'ALERT_NOT_FOUND', 'Alert not found');
    }

    return {
      success: true,
      data: alert,
    };
  });

  app.post('/api/v1/alert-lifecycle/:id/resolve', async (request) => {
    const params = alertParamsSchema.parse(request.params);
    const body = actionBodySchema.parse(request.body ?? {});
    const alert = await alertLifecycleService.resolve(params.id, {
      reason: body.reason ?? 'Resolved manually',
      metadata: {
        action: 'manual_resolve',
      },
    });

    if (!alert) {
      throw new HttpError(404, 'ALERT_NOT_FOUND', 'Alert not found');
    }

    return {
      success: true,
      data: alert,
    };
  });
}
