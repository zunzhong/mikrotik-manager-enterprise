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
          input.summary === undefined
            ? Prisma.JsonNull
            : (input.summary as Prisma.InputJsonValue),
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

  public async listSnapshots(deviceId: string) {
    return prisma.inventorySnapshot.findMany({
      where: { deviceId },
      orderBy: { collectedAt: 'desc' },
      include: {
        sections: true,
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
