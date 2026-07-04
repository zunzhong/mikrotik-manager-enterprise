import { collectorRegistry, defaultInventoryCollectors } from '../collector/index.js';
import { inventoryRepository } from '../infrastructure/inventory.repository.js';

if (collectorRegistry.list().length === 0) {
  collectorRegistry.registerMany(defaultInventoryCollectors);
}

export class InventoryService {
  public listSections() {
    return collectorRegistry.list().map((collector) => ({
      key: collector.key,
      category: collector.category,
      label: collector.label,
      path: collector.path,
      enabledByDefault: collector.enabledByDefault,
    }));
  }

  public listSnapshots(deviceId: string) {
    return inventoryRepository.listSnapshots(deviceId);
  }
}

export const inventoryService = new InventoryService();
