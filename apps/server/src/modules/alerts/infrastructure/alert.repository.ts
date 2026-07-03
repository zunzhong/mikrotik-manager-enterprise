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

  public async list() {
    return prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  public async acknowledge(id: string) {
    return prisma.alert.update({
      where: { id },
      data: {
        status: 'acknowledged',
        acknowledgedAt: new Date(),
      },
    });
  }
}

export const alertRepository = new AlertRepository();
