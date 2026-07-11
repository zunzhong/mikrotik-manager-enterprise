import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { HttpError } from '../../errors/http-error.js';
import { attachAuthContextPreHandler } from '../auth/auth.context.middleware.js';
import { rbacAnyGuard } from '../rbac/rbac.guard.js';
import type { RbacPermission } from '../rbac/rbac.types.js';
import { alertLifecycleService } from './alert-lifecycle.service.js';
import type { AlertLifecycleSeverity, AlertLifecycleStatus } from './alert-lifecycle.types.js';

const statusValues = ['open', 'acknowledged', 'resolved'] as const;
const severityValues = ['info', 'warning', 'critical'] as const;

const alertAcknowledgePreHandler = [
  attachAuthContextPreHandler,
  rbacAnyGuard(
    ['alert:acknowledge', 'alert:update', 'alert:manage'] as RbacPermission[],
    'Alert acknowledge permission is required',
  ),
];

const alertResolvePreHandler = [
  attachAuthContextPreHandler,
  rbacAnyGuard(
    ['alert:resolve', 'alert:update', 'alert:manage'] as RbacPermission[],
    'Alert resolve permission is required',
  ),
];

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

const deviceParamsSchema = z.object({
  deviceId: z.string().min(1),
});

const actionBodySchema = z.object({
  reason: z.string().min(1).optional(),
});

const bulkActionBodySchema = actionBodySchema.extend({
  alertIds: z.array(z.string().min(1)).min(1).max(500),
});

function splitEnum<const T extends readonly string[]>(
  value: string | undefined,
  allowed: T,
): T[number][] | undefined {
  if (!value) {
    return undefined;
  }

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
        severities: splitEnum(query.severity, severityValues) as
          AlertLifecycleSeverity[] | undefined,
        limit: query.limit,
      }),
    };
  });

  app.get('/api/v1/alert-lifecycle/active', async () => ({
    success: true,
    data: await alertLifecycleService.listActive(),
  }));

  app.post('/api/v1/alert-lifecycle/bulk/acknowledge', async (request) => {
    const body = bulkActionBodySchema.parse(request.body ?? {});

    return {
      success: true,
      data: await alertLifecycleService.acknowledgeMany(body.alertIds, {
        reason: body.reason ?? 'Bulk acknowledged manually',
        metadata: {
          action: 'bulk_manual_acknowledge',
        },
      }),
    };
  });

  app.post('/api/v1/alert-lifecycle/bulk/resolve', async (request) => {
    const body = bulkActionBodySchema.parse(request.body ?? {});

    return {
      success: true,
      data: await alertLifecycleService.resolveMany(body.alertIds, {
        reason: body.reason ?? 'Bulk resolved manually',
        metadata: {
          action: 'bulk_manual_resolve',
        },
      }),
    };
  });

  app.post('/api/v1/alert-lifecycle/device/:deviceId/resolve-active', async (request) => {
    const params = deviceParamsSchema.parse(request.params);
    const body = actionBodySchema.parse(request.body ?? {});

    return {
      success: true,
      data: await alertLifecycleService.resolveActiveForDevice(params.deviceId, {
        reason: body.reason ?? 'Resolved all active device alerts manually',
        metadata: {
          action: 'manual_resolve_device_active',
        },
      }),
    };
  });

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

  app.post(
    '/api/v1/alert-lifecycle/:id/acknowledge',
    {
      preHandler: alertAcknowledgePreHandler,
    },
    async (request) => {
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
    },
  );

  app.post(
    '/api/v1/alert-lifecycle/:id/resolve',
    {
      preHandler: alertResolvePreHandler,
    },
    async (request) => {
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
    },
  );
}
