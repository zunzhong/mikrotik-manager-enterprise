import { HttpError } from '../../../errors/http-error.js';
import { collectorRegistry } from '../collector/index.js';
import { inventoryApiRepository } from '../infrastructure/inventory-api.repository.js';

export class InventoryApiService {
  public async overview(deviceId: string) {
    const snapshot = await inventoryApiRepository.latestSnapshot(deviceId);
    const diff = await inventoryApiRepository.latestDiff(deviceId);

    if (!snapshot) {
      return {
        deviceId,
        hasSnapshot: false,
        snapshot: null,
        totals: {
          sections: 0,
          items: 0,
          categories: 0,
        },
        latestDiff: null,
      };
    }

    const categories = new Set(snapshot.sections.map((section) => section.category));

    return {
      deviceId,
      hasSnapshot: true,
      snapshot: {
        id: snapshot.id,
        collectedAt: snapshot.collectedAt,
        source: snapshot.source,
        status: snapshot.status,
        summary: snapshot.summary,
      },
      totals: {
        sections: snapshot.sections.length,
        items: snapshot.sections.reduce((sum, section) => sum + section.itemCount, 0),
        categories: categories.size,
      },
      latestDiff: diff
        ? {
            id: diff.id,
            createdAt: diff.createdAt,
            changeCount: diff.changeCount,
            summary: diff.summary,
          }
        : null,
    };
  }

  public async tree(deviceId: string) {
    const snapshot = await inventoryApiRepository.latestSnapshot(deviceId);

    if (!snapshot) {
      return {
        deviceId,
        snapshot: null,
        categories: this.emptyCategoryTree(),
      };
    }

    const groups = new Map<string, any[]>();

    for (const section of snapshot.sections) {
      const list = groups.get(section.category) ?? [];
      list.push({
        id: section.id,
        name: section.name,
        path: section.path,
        itemCount: section.itemCount,
      });
      groups.set(section.category, list);
    }

    return {
      deviceId,
      snapshot: {
        id: snapshot.id,
        collectedAt: snapshot.collectedAt,
        source: snapshot.source,
        status: snapshot.status,
      },
      categories: [...groups.entries()].map(([category, sections]) => ({
        category,
        sectionCount: sections.length,
        itemCount: sections.reduce((sum, section) => sum + section.itemCount, 0),
        sections,
      })),
    };
  }

  public async section(sectionId: string) {
    const section = await inventoryApiRepository.section(sectionId);

    if (!section) {
      throw new HttpError(404, 'INVENTORY_SECTION_NOT_FOUND', 'Inventory section not found');
    }

    return {
      id: section.id,
      snapshot: section.snapshot,
      name: section.name,
      category: section.category,
      path: section.path,
      itemCount: section.itemCount,
      raw: section.raw,
      items: section.items.map((item) => ({
        id: item.id,
        externalId: item.externalId,
        name: item.name,
        disabled: item.disabled,
        raw: item.raw,
      })),
    };
  }

  private emptyCategoryTree() {
    const groups = new Map<string, number>();

    for (const collector of collectorRegistry.list()) {
      groups.set(collector.category, (groups.get(collector.category) ?? 0) + 1);
    }

    return [...groups.entries()].map(([category, sectionCount]) => ({
      category,
      sectionCount,
      itemCount: 0,
      sections: [],
    }));
  }
}

export const inventoryApiService = new InventoryApiService();
