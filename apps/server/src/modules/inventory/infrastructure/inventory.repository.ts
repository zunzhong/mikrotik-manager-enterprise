import { Prisma } from '@prisma/client';
import { prisma } from '../../../database/index.js';

export interface CreateInventorySnapshotInput {
  deviceId: string;
  source: string;
  status: string;
  summary?: Record<string, unknown>;
}

export interface CreateInventorySectionInput {
  snapshotId: string;
  name: string;
  category: string;
  path: string;
  items: Array<Record<string, string>>;
}

export class InventoryRepository {
  public async createSnapshot(input: CreateInventorySnapshotInput) {
    return prisma.inventorySnapshot.create({
      data: {
        deviceId: input.deviceId,
        source: input.source,
        status: input.status,
        summary:
          input.summary === undefined ? Prisma.JsonNull : (input.summary as Prisma.InputJsonValue),
      },
    });
  }

  public async createSection(input: CreateInventorySectionInput) {
    return prisma.inventorySection.create({
      data: {
        snapshotId: input.snapshotId,
        name: input.name,
        category: input.category,
        path: input.path,
        itemCount: input.items.length,
        raw: input.items as Prisma.InputJsonValue,
        items: {
          create: input.items.map((item) => ({
            externalId: item['.id'],
            name: item.name,
            disabled: this.parseDisabled(item.disabled),
            raw: item as Prisma.InputJsonValue,
          })),
        },
      },
      include: {
        items: true,
      },
    });
  }

  public updateSnapshot(
    snapshotId: string,
    input: { status: string; summary: Record<string, unknown> },
  ) {
    return prisma.inventorySnapshot.update({
      where: { id: snapshotId },
      data: {
        status: input.status,
        summary: input.summary as Prisma.InputJsonValue,
      },
    });
  }

  public async listSnapshots(deviceId: string) {
    return prisma.inventorySnapshot.findMany({
      where: { deviceId },
      orderBy: { collectedAt: 'desc' },
      include: {
        sections: {
          orderBy: [{ category: 'asc' }, { name: 'asc' }],
        },
      },
    });
  }

  public async latestSnapshot(deviceId: string) {
    return prisma.inventorySnapshot.findFirst({
      where: { deviceId },
      orderBy: { collectedAt: 'desc' },
      include: {
        sections: {
          orderBy: [{ category: 'asc' }, { name: 'asc' }],
        },
      },
    });
  }

  public async getSnapshot(snapshotId: string) {
    return prisma.inventorySnapshot.findUnique({
      where: { id: snapshotId },
      include: {
        device: {
          select: {
            id: true,
            name: true,
            host: true,
            status: true,
          },
        },
        sections: {
          orderBy: [{ category: 'asc' }, { name: 'asc' }],
          include: {
            items: {
              take: 20,
              orderBy: [{ name: 'asc' }],
            },
          },
        },
      },
    });
  }

  public async listSnapshotSections(snapshotId: string) {
    return prisma.inventorySection.findMany({
      where: { snapshotId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: {
        items: {
          orderBy: [{ name: 'asc' }],
        },
      },
    });
  }

  private parseDisabled(value?: string): boolean | undefined {
    if (value === undefined) {
      return undefined;
    }

    return value === 'true' || value === 'yes';
  }
}

export const inventoryRepository = new InventoryRepository();
