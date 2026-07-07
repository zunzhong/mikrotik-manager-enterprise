import { Prisma } from '@prisma/client';
import { prisma } from '../../database/index.js';
import type {
  AlertLifecycleStatus,
  AlertResolutionInput,
  OpenAlertInput,
} from './alert-lifecycle.types.js';

type MutableInputJsonObject = Record<string, Prisma.InputJsonValue | null>;

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

    return prisma.alert.create({
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
  }

  public async acknowledge(alertId: string, input: AlertResolutionInput) {
    const now = new Date();

    const existing = await prisma.alert.findUnique({
      where: {
        id: alertId,
      },
    });

    if (!existing) return null;

    return prisma.alert.update({
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
  }

  public async resolve(alertId: string, input: AlertResolutionInput) {
    const now = new Date();

    const existing = await prisma.alert.findUnique({
      where: {
        id: alertId,
      },
    });

    if (!existing) return null;

    return prisma.alert.update({
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

  public async listActive(statuses: AlertLifecycleStatus[] = ['open', 'acknowledged']) {
    return prisma.alert.findMany({
      where: {
        status: {
          in: statuses,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });
  }
}

export const alertLifecycleService = new AlertLifecycleService();
