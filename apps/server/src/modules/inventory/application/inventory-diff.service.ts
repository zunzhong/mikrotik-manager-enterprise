import { eventBus } from '../../../core/index.js';
import { inventoryDiffRepository, type InventoryDiffChangeInput } from '../infrastructure/inventory-diff.repository.js';

type SnapshotWithSections = Awaited<
  ReturnType<typeof inventoryDiffRepository.getLatestSnapshots>
>[number];

export class InventoryDiffService {
  public async list(deviceId: string) {
    return inventoryDiffRepository.listDiffs(deviceId);
  }

  public async diffLatest(deviceId: string) {
    const snapshots = await inventoryDiffRepository.getLatestSnapshots(deviceId);

    if (snapshots.length < 2) {
      return {
        created: false,
        reason: 'At least two inventory snapshots are required',
      };
    }

    const [current, previous] = snapshots;
    const changes = this.compareSnapshots(previous, current);
    const summary = this.createSummary(changes);

    const diff = await inventoryDiffRepository.createDiff({
      deviceId,
      previousSnapshotId: previous.id,
      currentSnapshotId: current.id,
      changes,
      summary,
    });

    await eventBus.emit('inventory.diff.created', {
      deviceId,
      diffId: diff.id,
      changeCount: changes.length,
      summary,
    });

    return {
      created: true,
      diff,
    };
  }

  private compareSnapshots(
    previous: SnapshotWithSections,
    current: SnapshotWithSections,
  ): InventoryDiffChangeInput[] {
    const changes: InventoryDiffChangeInput[] = [];

    const previousSections = new Map(previous.sections.map((section) => [section.path, section]));
    const currentSections = new Map(current.sections.map((section) => [section.path, section]));

    for (const [path, currentSection] of currentSections) {
      const previousSection = previousSections.get(path);

      if (!previousSection) {
        for (const item of currentSection.items) {
          changes.push({
            category: currentSection.category,
            path,
            changeType: 'added',
            itemKey: this.getItemKey(item.raw as Record<string, unknown>),
            after: item.raw as Record<string, unknown>,
          });
        }
        continue;
      }

      const previousItems = this.itemMap(previousSection.items);
      const currentItems = this.itemMap(currentSection.items);

      for (const [key, currentItem] of currentItems) {
        const previousItem = previousItems.get(key);

        if (!previousItem) {
          changes.push({
            category: currentSection.category,
            path,
            changeType: 'added',
            itemKey: key,
            after: currentItem,
          });
          continue;
        }

        if (JSON.stringify(previousItem) !== JSON.stringify(currentItem)) {
          changes.push({
            category: currentSection.category,
            path,
            changeType: 'changed',
            itemKey: key,
            before: previousItem,
            after: currentItem,
          });
        }
      }

      for (const [key, previousItem] of previousItems) {
        if (!currentItems.has(key)) {
          changes.push({
            category: currentSection.category,
            path,
            changeType: 'removed',
            itemKey: key,
            before: previousItem,
          });
        }
      }
    }

    return changes;
  }

  private itemMap(items: Array<{ raw: unknown }>): Map<string, Record<string, unknown>> {
    const map = new Map<string, Record<string, unknown>>();

    for (const item of items) {
      const raw = item.raw as Record<string, unknown>;
      map.set(this.getItemKey(raw), raw);
    }

    return map;
  }

  private getItemKey(item: Record<string, unknown>): string {
    const id = item['.id'];
    const name = item.name;
    const address = item.address;
    const comment = item.comment;

    if (typeof id === 'string') return id;
    if (typeof name === 'string') return name;
    if (typeof address === 'string') return address;
    if (typeof comment === 'string') return comment;

    return JSON.stringify(item);
  }

  private createSummary(changes: InventoryDiffChangeInput[]) {
    return {
      total: changes.length,
      added: changes.filter((change) => change.changeType === 'added').length,
      removed: changes.filter((change) => change.changeType === 'removed').length,
      changed: changes.filter((change) => change.changeType === 'changed').length,
    };
  }
}

export const inventoryDiffService = new InventoryDiffService();
