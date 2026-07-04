import { HttpError } from '../../../errors/http-error.js';
import { eventBus } from '../../../core/index.js';
import {
  inventoryDiffRepository,
  type InventoryDiffChangeInput,
} from '../infrastructure/inventory-diff.repository.js';

type SnapshotWithSections = Awaited<
  ReturnType<typeof inventoryDiffRepository.getLatestSnapshots>
>[number];

export class InventoryDiffService {
  public async list(deviceId: string) {
    return inventoryDiffRepository.listDiffs(deviceId);
  }

  public async get(diffId: string) {
    const diff = await inventoryDiffRepository.getDiff(diffId);

    if (!diff) {
      throw new HttpError(404, 'DIFF_NOT_FOUND', 'Inventory diff not found');
    }

    return diff;
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

        const normalizedPrevious = this.normalizeRaw(previousItem);
        const normalizedCurrent = this.normalizeRaw(currentItem);

        if (JSON.stringify(normalizedPrevious) !== JSON.stringify(normalizedCurrent)) {
          changes.push({
            category: currentSection.category,
            path,
            changeType: 'changed',
            itemKey: key,
            before: normalizedPrevious,
            after: normalizedCurrent,
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
            before: this.normalizeRaw(previousItem),
          });
        }
      }
    }

    for (const [path, previousSection] of previousSections) {
      if (currentSections.has(path)) {
        continue;
      }

      for (const item of previousSection.items) {
        const raw = item.raw as Record<string, unknown>;
        changes.push({
          category: previousSection.category,
          path,
          changeType: 'removed',
          itemKey: this.getItemKey(raw),
          before: this.normalizeRaw(raw),
        });
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
    const macAddress = item['mac-address'];
    const comment = item.comment;

    if (typeof id === 'string') return id;
    if (typeof name === 'string') return name;
    if (typeof address === 'string') return address;
    if (typeof macAddress === 'string') return macAddress;
    if (typeof comment === 'string') return comment;

    return JSON.stringify(this.normalizeRaw(item));
  }

  private normalizeRaw(item: Record<string, unknown>): Record<string, unknown> {
    const ignoredKeys = new Set([
      'last-seen',
      'uptime',
      'running-time',
      'rx-byte',
      'tx-byte',
      'rx-packet',
      'tx-packet',
      'fp-rx-byte',
      'fp-tx-byte',
    ]);

    return Object.fromEntries(
      Object.entries(item)
        .filter(([key]) => !ignoredKeys.has(key))
        .sort(([a], [b]) => a.localeCompare(b)),
    );
  }

  private createSummary(changes: InventoryDiffChangeInput[]) {
    return {
      total: changes.length,
      added: changes.filter((change) => change.changeType === 'added').length,
      removed: changes.filter((change) => change.changeType === 'removed').length,
      changed: changes.filter((change) => change.changeType === 'changed').length,
      byCategory: changes.reduce<Record<string, number>>((acc, change) => {
        acc[change.category] = (acc[change.category] ?? 0) + 1;
        return acc;
      }, {}),
    };
  }
}

export const inventoryDiffService = new InventoryDiffService();
