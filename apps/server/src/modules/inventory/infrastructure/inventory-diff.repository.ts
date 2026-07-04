import { Prisma } from '@prisma/client';
import { prisma } from '../../../database/index.js';

export interface InventoryDiffChangeInput {
  category: string;
  path: string;
  changeType: 'added' | 'removed' | 'changed';
  itemKey?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export class InventoryDiffRepository {
  public async listDiffs(deviceId: string) {
    return prisma.inventoryDiff.findMany({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
      include: {
        changes: {
          take: 50,
          orderBy: [{ category: 'asc' }, { path: 'asc' }],
        },
      },
    });
  }

  public async getDiff(diffId: string) {
    return prisma.inventoryDiff.findUnique({
      where: { id: diffId },
      include: {
        device: {
          select: {
            id: true,
            name: true,
            host: true,
          },
        },
        changes: {
          orderBy: [{ category: 'asc' }, { path: 'asc' }, { changeType: 'asc' }],
        },
      },
    });
  }

  public async getLatestSnapshots(deviceId: string) {
    return prisma.inventorySnapshot.findMany({
      where: { deviceId },
      orderBy: { collectedAt: 'desc' },
      take: 2,
      include: {
        sections: {
          include: {
            items: true,
          },
        },
      },
    });
  }

  public async createDiff(input: {
    deviceId: string;
    previousSnapshotId: string;
    currentSnapshotId: string;
    changes: InventoryDiffChangeInput[];
    summary: Record<string, unknown>;
  }) {
    return prisma.inventoryDiff.create({
      data: {
        deviceId: input.deviceId,
        previousSnapshotId: input.previousSnapshotId,
        currentSnapshotId: input.currentSnapshotId,
        changeCount: input.changes.length,
        summary: input.summary as Prisma.InputJsonValue,
        changes: {
          create: input.changes.map((change) => ({
            category: change.category,
            path: change.path,
            changeType: change.changeType,
            itemKey: change.itemKey,
            before:
              change.before === undefined ? Prisma.JsonNull : (change.before as Prisma.InputJsonValue),
            after:
              change.after === undefined ? Prisma.JsonNull : (change.after as Prisma.InputJsonValue),
          })),
        },
      },
      include: {
        changes: true,
      },
    });
  }
}

export const inventoryDiffRepository = new InventoryDiffRepository();
