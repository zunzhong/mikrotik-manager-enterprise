import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  auditEventsToCsv,
  auditExportFilename,
  type AuditExportFormat,
} from './audit.export.js';
import { auditService } from './audit.service.js';

const actorTypeValues = ['system', 'user', 'api', 'agent', 'scheduler'] as const;
const entityTypeValues = [
  'system',
  'device',
  'event',
  'alert',
  'notification_channel',
  'notification_rule',
  'notification_delivery',
  'auth',
  'config',
] as const;
const severityValues = ['info', 'warning', 'critical'] as const;
const statusValues = ['success', 'failure'] as const;
const exportFormatValues = ['json', 'csv'] as const;

const auditActorSchema = z.object({
  type: z.enum(actorTypeValues),
  id: z.string().optional(),
  name: z.string().optional(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
});

const auditEntitySchema = z.object({
  type: z.enum(entityTypeValues),
  id: z.string().optional(),
  name: z.string().optional(),
});

const auditQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(1000).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  action: z.string().optional(),
  actorType: z.enum(actorTypeValues).optional(),
  actorId: z.string().optional(),
  entityType: z.enum(entityTypeValues).optional(),
  entityId: z.string().optional(),
  severity: z.enum(severityValues).optional(),
  status: z.enum(statusValues).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const auditExportQuerySchema = auditQuerySchema.extend({
  format: z.enum(exportFormatValues).default('json'),
});

const auditRetentionSchema = z.object({
  days: z.coerce.number().int().positive().max(3650),
  dryRun: z.coerce.boolean().optional().default(true),
});

const auditIdParamsSchema = z.object({
  id: z.string().min(1),
});

const createAuditEventSchema = z.object({
  action: z.string().min(1),
  actor: auditActorSchema.optional(),
  entity: auditEntitySchema.optional(),
  severity: z.enum(severityValues).optional(),
  status: z.enum(statusValues).optional(),
  summary: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().optional(),
});

export async function auditRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/audit/summary', async (request) => {
    const query = auditQuerySchema.parse(request.query);

    return {
      success: true,
      data: await auditService.summary(query),
    };
  });

  app.get('/api/v1/audit/page', async (request) => {
    const query = auditQuerySchema.parse(request.query);

    return {
      success: true,
      data: await auditService.paginate(query),
    };
  });

  app.get('/api/v1/audit/export', async (request, reply) => {
    const query = auditExportQuerySchema.parse(request.query);
    const format = query.format as AuditExportFormat;
    const events = await auditService.list({
      ...query,
      limit: query.limit ?? 1000,
    });

    if (format === 'csv') {
      const csv = auditEventsToCsv(events);

      reply
        .header('content-type', 'text/csv; charset=utf-8')
        .header('content-disposition', `attachment; filename="${auditExportFilename('csv')}"`);

      return csv;
    }

    reply
      .header('content-type', 'application/json; charset=utf-8')
      .header('content-disposition', `attachment; filename="${auditExportFilename('json')}"`);

    return {
      success: true,
      data: {
        exportedAt: new Date().toISOString(),
        count: events.length,
        items: events,
      },
    };
  });

  app.post('/api/v1/audit/retention/prune', async (request) => {
    const body = auditRetentionSchema.parse(request.body ?? {});
    const result = await auditService.pruneRetention(body);

    await auditService.logSuccess({
      action: body.dryRun ? 'audit.retention.dry_run' : 'audit.retention.pruned',
      summary: body.dryRun
        ? `Audit retention dry-run matched ${result.matched} event(s)`
        : `Audit retention deleted ${result.deleted} event(s)`,
      actor: {
        type: 'api',
        id: 'audit-retention',
        name: 'Audit Retention API',
      },
      entity: {
        type: 'system',
        id: 'audit',
        name: 'Audit Log Engine',
      },
      metadata: {
        retention: result,
      },
    });

    return {
      success: true,
      data: result,
    };
  });

  app.get('/api/v1/audit', async (request) => {
    const query = auditQuerySchema.parse(request.query);

    return {
      success: true,
      data: await auditService.list(query),
    };
  });

  app.get('/api/v1/audit/:id', async (request, reply) => {
    const params = auditIdParamsSchema.parse(request.params);
    const event = await auditService.get(params.id);

    if (!event) {
      reply.code(404);
      return {
        success: false,
        error: 'Audit event not found',
      };
    }

    return {
      success: true,
      data: event,
    };
  });

  app.post('/api/v1/audit', async (request) => {
    const body = createAuditEventSchema.parse(request.body ?? {});

    return {
      success: true,
      data: await auditService.record(body),
    };
  });

  app.post('/api/v1/audit/seed-demo', async () => {
    const created = await Promise.all([
      auditService.logSuccess({
        action: 'audit.seed_demo',
        summary: 'Audit demo events were seeded',
        actor: {
          type: 'api',
          id: 'manual',
          name: 'Manual API',
        },
        entity: {
          type: 'system',
          id: 'audit',
          name: 'Audit Log Engine',
        },
        metadata: {
          seed: true,
        },
      }),
      auditService.logSuccess({
        action: 'notification.channel.created',
        summary: 'Demo notification channel was created',
        actor: {
          type: 'user',
          id: 'demo-user',
          name: 'Demo User',
        },
        entity: {
          type: 'notification_channel',
          id: 'demo-channel',
          name: 'Demo Webhook',
        },
      }),
      auditService.logFailure({
        action: 'notification.delivery.failed',
        summary: 'Demo notification delivery failed',
        actor: {
          type: 'system',
          id: 'notification-worker',
          name: 'Notification Worker',
        },
        entity: {
          type: 'notification_delivery',
          id: 'demo-delivery',
          name: 'Demo Delivery',
        },
        severity: 'warning',
        metadata: {
          error: 'Demo webhook timeout',
        },
      }),
    ]);

    return {
      success: true,
      data: {
        created: created.length,
        events: created,
      },
    };
  });
}
