import { Prisma } from '@prisma/client';
import { prisma } from '../../database/index.js';

export interface CreateAuditLogInput {
  actorId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export class AuditLogRepository {
  public async create(input: CreateAuditLogInput) {
    return prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        metadata:
          input.metadata === undefined
            ? Prisma.JsonNull
            : (input.metadata as Prisma.InputJsonValue),
        ipAddress: input.ipAddress,
      },
    });
  }

  public async findMany(options: { take?: number } = {}) {
    return prisma.auditLog.findMany({
      take: options.take ?? 100,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

export const auditLogRepository = new AuditLogRepository();
