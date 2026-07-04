import { HttpError } from '../../../errors/http-error.js';
import { inventoryRepository } from '../infrastructure/inventory.repository.js';

export class InventorySnapshotService {
  public async list(deviceId: string) {
    const snapshots = await inventoryRepository.listSnapshots(deviceId);

    return snapshots.map((snapshot) => this.toSummary(snapshot));
  }

  public async latest(deviceId: string) {
    const snapshot = await inventoryRepository.latestSnapshot(deviceId);

    if (!snapshot) {
      return null;
    }

    return this.toSummary(snapshot);
  }

  public async get(snapshotId: string) {
    const snapshot = await inventoryRepository.getSnapshot(snapshotId);

    if (!snapshot) {
      throw new HttpError(404, 'SNAPSHOT_NOT_FOUND', 'Inventory snapshot not found');
    }

    return snapshot;
  }

  public async sections(snapshotId: string) {
    return inventoryRepository.listSnapshotSections(snapshotId);
  }

  private toSummary(snapshot: any) {
    return {
      id: snapshot.id,
      deviceId: snapshot.deviceId,
      collectedAt: snapshot.collectedAt,
      source: snapshot.source,
      status: snapshot.status,
      summary: snapshot.summary,
      sectionCount: snapshot.sections?.length ?? 0,
      itemCount:
        snapshot.sections?.reduce((sum: number, section: { itemCount: number }) => {
          return sum + section.itemCount;
        }, 0) ?? 0,
      sections:
        snapshot.sections?.map((section: any) => ({
          id: section.id,
          name: section.name,
          category: section.category,
          path: section.path,
          itemCount: section.itemCount,
        })) ?? [],
    };
  }
}

export const inventorySnapshotService = new InventorySnapshotService();
