import { Prisma } from '@prisma/client';
import { prisma } from '../../database/index.js';
import { eventBus } from '../events/index.js';
import type {
  AlertLifecycleBulkActionResult,
  AlertLifecycleSeverity,
  AlertLifecycleStatus,
  AlertResolutionInput,
  OpenAlertInput,
} from './alert-lifecycle.types.js';

type MutableInputJsonObject = Record<string, Prisma.InputJsonValue | null>;

export interface AlertLifecycleListQuery {
  deviceId?: string;
  ruleKey?: string;
  statuses?: AlertLifecycleStatus[];
  severities?: AlertLifecycleSeverity[];
  limit?: number;
}

interface AlertEventLike {
  id: string;
  deviceId: string | null;
  ruleKey: string;
  severity: string;
  status: string;
  title: string;
  message: string;
  source: string;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  acknowledgedAt?: Date | null;
  resolvedAt?: Date | null;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item)) as Prisma.InputJsonArray;
  }

  if (typeof value === 'object') {
    const output: MutableInputJsonObject = {};

    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      output[key] = toJsonValue(item);
    }

    return output as Prisma.InputJsonObject;
  }

  return String(value);
}

function toJsonObject(value: Record<string, unknown>): Prisma.InputJsonObject {
  const output: MutableInputJsonObject = {};

  for (const [key, item] of Object.entries(value)) {
    output[key] = toJsonValue(item);
  }

  return output as Prisma.InputJsonObject;
}

function readJsonObject(value: Prisma.JsonValue | null): Record<string, unknown> {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return {};
  }

  return value as Record<string, unknown>;
}

function mergeMetadata(
  previous: Prisma.JsonValue | null,
  next: Record<string, unknown> | undefined,
  now: Date,
): Prisma.InputJsonObject {
  const current = readJsonObject(previous);
  const previousCount = Number(current.occurrenceCount ?? 0);
  const firstSeenAt =
    typeof current.firstSeenAt === 'string' ? current.firstSeenAt : now.toISOString();

  return toJsonObject({
    ...current,
    ...(next ?? {}),
    firstSeenAt,
    lastSeenAt: now.toISOString(),
    occurrenceCount: previousCount + 1,
  });
}

function normalizeLimit(limit: number | undefined): number {
  return Math.min(Math.max(limit ?? 100, 1), 500);
}

function compact<T>(items: Array<T | null>): T[] {
  return items.filter((item): item is T => item !== null);
}

function deviceNameFromMetadata(metadata: Prisma.JsonValue | null): string | undefined {
  const value = readJsonObject(metadata);
  return typeof value.deviceName === 'string' ? value.deviceName : undefined;
}

function publishOpenedEvent(alert: AlertEventLike): void {
  eventBus.publish({
    type: 'ALERT_OPENED',
    severity: alert.severity === 'critical' ? 'critical' : alert.severity === 'warning' ? 'warning' : 'info',
    title: 'Alert opened',
    message: alert.title,
    source: 'alert-lifecycle',
    deviceId: alert.deviceId ?? undefined,
    deviceName: deviceNameFromMetadata(alert.metadata),
    metadata: {
      alertId: alert.id,
      alertStatus: alert.status,
      ruleKey: alert.ruleKey,
      alertSeverity: alert.severity,
      source: alert.source,
      createdAt: alert.createdAt.toISOString(),
    },
  });
}

function publishAcknowledgedEvent(alert: AlertEventLike, reason: string): void {
  eventBus.publish({
    type: 'ALERT_ACKNOWLEDGED',
    severity: 'info',
    title: 'Alert acknowledged',
    message: alert.title,
    source: 'alert-lifecycle',
    deviceId: alert.deviceId ?? undefined,
    deviceName: deviceNameFromMetadata(alert.metadata),
    metadata: {
      alertId: alert.id,
      alertStatus: alert.status,
      ruleKey: alert.ruleKey,
      alertSeverity: alert.severity,
      reason,
      acknowledgedAt: alert.acknowledgedAt?.toISOString(),
    },
  });
}

function publishResolvedEvent(alert: AlertEventLike, reason: string): void {
  eventBus.publish({
    type: 'ALERT_RESOLVED',
    severity: 'success',
    title: 'Alert resolved',
    message: alert.title,
    source: 'alert-lifecycle',
    deviceId: alert.deviceId ?? undefined,
    deviceName: deviceNameFromMetadata(alert.metadata),
    metadata: {
      alertId: alert.id,
      alertStatus: alert.status,
      ruleKey: alert.ruleKey,
      alertSeverity: alert.severity,
      reason,
      resolvedAt: alert.resolvedAt?.toISOString(),
    },
  });
}

export class AlertLifecycleService {
  public async openOrUpdate(input: OpenAlertInput) {
    const now = new Date();

    const existing = await prisma.alert.findFirst({
      where: {
        deviceId: input.deviceId,
        ruleKey: input.ruleKey,
        status: {
          in: ['open', 'acknowledged'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (existing) {
      return prisma.alert.update({
        where: {
          id: existing.id,
        },
        data: {
          severity: input.severity,
          title: input.title,
          message: input.message,
          source: input.source,
          metadata: mergeMetadata(existing.metadata, input.metadata, now),
        },
      });
    }

    const alert = await prisma.alert.create({
      data: {
        deviceId: input.deviceId,
        ruleKey: input.ruleKey,
        severity: input.severity,
        status: 'open',
        title: input.title,
        message: input.message,
        source: input.source,
        metadata: mergeMetadata(null, input.metadata, now),
      },
    });

    publishOpenedEvent(alert);

    return alert;
  }

  public async getById(alertId: string) {
    return prisma.alert.findUnique({
      where: {
        id: alertId,
      },
      include: {
        device: {
          select: {
            id: true,
            name: true,
            host: true,
            status: true,
          },
        },
      },
    });
  }

  public async acknowledge(alertId: string, input: AlertResolutionInput) {
    const now = new Date();

    const existing = await prisma.alert.findUnique({
      where: {
        id: alertId,
      },
    });

    if (!existing) return null;

    const alert = await prisma.alert.update({
      where: {
        id: alertId,
      },
      data: {
        status: 'acknowledged',
        acknowledgedAt: existing.acknowledgedAt ?? now,
        metadata: mergeMetadata(
          existing.metadata,
          {
            ...(input.metadata ?? {}),
            acknowledgedReason: input.reason,
            acknowledgedAt: now.toISOString(),
          },
          now,
        ),
      },
    });

    if (!existing.acknowledgedAt) {
      publishAcknowledgedEvent(alert, input.reason);
    }

    return alert;
  }

  public async resolve(alertId: string, input: AlertResolutionInput) {
    const now = new Date();

    const existing = await prisma.alert.findUnique({
      where: {
        id: alertId,
      },
    });

    if (!existing) return null;

    const alert = await prisma.alert.update({
      where: {
        id: alertId,
      },
      data: {
        status: 'resolved',
        resolvedAt: existing.resolvedAt ?? now,
        metadata: mergeMetadata(
          existing.metadata,
          {
            ...(input.metadata ?? {}),
            resolvedReason: input.reason,
            resolvedAt: now.toISOString(),
          },
          now,
        ),
      },
    });

    if (!existing.resolvedAt) {
      publishResolvedEvent(alert, input.reason);
    }

    return alert;
  }

  public async acknowledgeMany(
    alertIds: string[],
    input: AlertResolutionInput,
  ): Promise<AlertLifecycleBulkActionResult> {
    const uniqueIds = [...new Set(alertIds)];
    const alerts = compact(await Promise.all(uniqueIds.map((id) => this.acknowledge(id, input))));

    return {
      requested: uniqueIds.length,
      updated: alerts.length,
      missing: uniqueIds.length - alerts.length,
      alerts,
    };
  }

  public async resolveMany(
    alertIds: string[],
    input: AlertResolutionInput,
  ): Promise<AlertLifecycleBulkActionResult> {
    const uniqueIds = [...new Set(alertIds)];
    const alerts = compact(await Promise.all(uniqueIds.map((id) => this.resolve(id, input))));

    return {
      requested: uniqueIds.length,
      updated: alerts.length,
      missing: uniqueIds.length - alerts.length,
      alerts,
    };
  }

  public async resolveForDevice(
    deviceId: string,
    ruleKeys: string[],
    input: AlertResolutionInput,
  ) {
    if (ruleKeys.length === 0) {
      return [];
    }

    const alerts = await prisma.alert.findMany({
      where: {
        deviceId,
        ruleKey: {
          in: ruleKeys,
        },
        status: {
          in: ['open', 'acknowledged'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return Promise.all(alerts.map((alert) => this.resolve(alert.id, input)));
  }

  public async resolveActiveForDevice(
    deviceId: string,
    input: AlertResolutionInput,
  ): Promise<AlertLifecycleBulkActionResult> {
    const alerts = await prisma.alert.findMany({
      where: {
        deviceId,
        status: {
          in: ['open', 'acknowledged'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const resolved = compact(await Promise.all(alerts.map((alert) => this.resolve(alert.id, input))));

    return {
      requested: alerts.length,
      updated: resolved.length,
      missing: alerts.length - resolved.length,
      alerts: resolved,
    };
  }

  public async list(query: AlertLifecycleListQuery = {}) {
    return prisma.alert.findMany({
      where: {
        deviceId: query.deviceId,
        ruleKey: query.ruleKey,
        status: query.statuses?.length
          ? {
              in: query.statuses,
            }
          : undefined,
        severity: query.severities?.length
          ? {
              in: query.severities,
            }
          : undefined,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: normalizeLimit(query.limit),
      include: {
        device: {
          select: {
            id: true,
            name: true,
            host: true,
            status: true,
          },
        },
      },
    });
  }

  public async listActive(statuses: AlertLifecycleStatus[] = ['open', 'acknowledged']) {
    return this.list({
      statuses,
      limit: 100,
    });
  }

  public async summary() {
    const [open, acknowledged, resolved, critical, warning, info] = await Promise.all([
      prisma.alert.count({ where: { status: 'open' } }),
      prisma.alert.count({ where: { status: 'acknowledged' } }),
      prisma.alert.count({ where: { status: 'resolved' } }),
      prisma.alert.count({ where: { status: { in: ['open', 'acknowledged'] }, severity: 'critical' } }),
      prisma.alert.count({ where: { status: { in: ['open', 'acknowledged'] }, severity: 'warning' } }),
      prisma.alert.count({ where: { status: { in: ['open', 'acknowledged'] }, severity: 'info' } }),
    ]);

    return {
      status: {
        open,
        acknowledged,
        resolved,
      },
      activeSeverity: {
        critical,
        warning,
        info,
      },
      activeTotal: open + acknowledged,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const alertLifecycleService = new AlertLifecycleService();
