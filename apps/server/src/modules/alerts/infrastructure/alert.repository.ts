import { Prisma } from '@prisma/client';
import { prisma } from '../../../database/index.js';

export interface CreateAlertInput {
  deviceId?: string;
  ruleKey: string;
  severity: string;
  title: string;
  message: string;
  source: string;
  metadata?: Record<string, unknown>;
}

export class AlertRepository {
  public async create(input: CreateAlertInput) {
    return prisma.alert.create({
      data: {
        deviceId: input.deviceId,
        ruleKey: input.ruleKey,
        severity: input.severity,
        title: input.title,
        message: input.message,
        source: input.source,
        metadata:
          input.metadata === undefined
            ? Prisma.JsonNull
            : (input.metadata as Prisma.InputJsonValue),
      },
    });
  }

  public async createOrRefresh(input: CreateAlertInput) {
    const existing = await prisma.alert.findFirst({
      where: {
        deviceId: input.deviceId ?? null,
        ruleKey: input.ruleKey,
        status: { in: ['open', 'acknowledged'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    const metadata =
      input.metadata === undefined ? Prisma.JsonNull : (input.metadata as Prisma.InputJsonValue);

    if (existing) {
      await prisma.alert.updateMany({
        where: {
          id: { not: existing.id },
          deviceId: input.deviceId ?? null,
          ruleKey: input.ruleKey,
          status: { in: ['open', 'acknowledged'] },
        },
        data: { status: 'resolved', resolvedAt: new Date() },
      });
      return prisma.alert.update({
        where: { id: existing.id },
        data: {
          severity: input.severity,
          title: input.title,
          message: input.message,
          source: input.source,
          metadata,
        },
      });
    }

    return this.create(input);
  }

  public async list() {
    const alerts = await prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { device: { select: { id: true, name: true, host: true } } },
    });

    const active = new Set<string>();
    return alerts
      .filter((alert) => {
        if (alert.status === 'resolved') return true;
        const key = `${alert.deviceId ?? 'system'}:${alert.ruleKey}`;
        if (active.has(key)) return false;
        active.add(key);
        return true;
      })
      .slice(0, 200);
  }

  public async acknowledge(id: string) {
    const existing = await prisma.alert.findUnique({ where: { id } });
    if (!existing) return null;
    return prisma.alert.update({
      where: { id },
      data: {
        status: 'acknowledged',
        acknowledgedAt: existing.acknowledgedAt ?? new Date(),
      },
    });
  }

  public async resolve(id: string) {
    const existing = await prisma.alert.findUnique({ where: { id } });
    if (!existing) return null;
    return prisma.alert.update({
      where: { id },
      data: { status: 'resolved', resolvedAt: existing.resolvedAt ?? new Date() },
    });
  }

  public async delete(id: string) {
    const result = await prisma.alert.deleteMany({ where: { id } });
    return result.count;
  }

  public async deleteAll(deviceId?: string) {
    const result = await prisma.alert.deleteMany({
      where: deviceId ? { deviceId } : undefined,
    });
    return result.count;
  }
}

export const alertRepository = new AlertRepository();
