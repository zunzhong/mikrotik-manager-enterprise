import { Prisma } from '@prisma/client';
import { prisma } from '../../../database/index.js';

export class BackupRepository {
  public listByDevice(deviceId: string) {
    return prisma.backupRecord.findMany({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  public findById(id: string) {
    return prisma.backupRecord.findUnique({
      where: { id },
      include: {
        device: {
          select: {
            id: true,
            name: true,
            host: true,
          },
        },
      },
    });
  }

  public findManyByIds(ids: string[]) {
    return prisma.backupRecord.findMany({
      where: { id: { in: ids } },
      orderBy: { createdAt: 'asc' },
    });
  }

  public create(input: {
    deviceId: string;
    type: string;
    status: string;
    fileName: string;
    filePath?: string;
    metadata?: Record<string, unknown>;
  }) {
    return prisma.backupRecord.create({
      data: {
        deviceId: input.deviceId,
        type: input.type,
        status: input.status,
        fileName: input.fileName,
        filePath: input.filePath,
        metadata:
          input.metadata === undefined
            ? Prisma.JsonNull
            : (input.metadata as Prisma.InputJsonValue),
      },
    });
  }

  public update(
    id: string,
    input: {
      status?: string;
      filePath?: string;
      sizeBytes?: number;
      checksum?: string;
      error?: string;
      metadata?: Record<string, unknown>;
      completedAt?: Date;
    },
  ) {
    return prisma.backupRecord.update({
      where: { id },
      data: {
        status: input.status,
        filePath: input.filePath,
        sizeBytes: input.sizeBytes,
        checksum: input.checksum,
        error: input.error,
        completedAt: input.completedAt,
        metadata:
          input.metadata === undefined ? undefined : (input.metadata as Prisma.InputJsonValue),
      },
    });
  }

  public delete(id: string) {
    return prisma.backupRecord.delete({
      where: { id },
    });
  }
}

export const backupRepository = new BackupRepository();
