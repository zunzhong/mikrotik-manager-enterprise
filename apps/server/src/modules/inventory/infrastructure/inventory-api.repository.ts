import { prisma } from '../../../database/index.js';

export class InventoryApiRepository {
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

  public async latestDiff(deviceId: string) {
    return prisma.inventoryDiff.findFirst({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
      include: {
        changes: {
          take: 20,
          orderBy: [{ category: 'asc' }, { path: 'asc' }],
        },
      },
    });
  }

  public async section(sectionId: string) {
    return prisma.inventorySection.findUnique({
      where: { id: sectionId },
      include: {
        snapshot: {
          select: {
            id: true,
            deviceId: true,
            collectedAt: true,
          },
        },
        items: {
          orderBy: [{ name: 'asc' }],
        },
      },
    });
  }
}

export const inventoryApiRepository = new InventoryApiRepository();
