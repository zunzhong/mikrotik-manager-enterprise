import { collectorRegistry, defaultInventoryCollectors } from '../collector/index.js';

if (collectorRegistry.list().length === 0) {
  collectorRegistry.registerMany(defaultInventoryCollectors);
}

export interface InventorySectionDefinition {
  key: string;
  category: string;
  label: string;
  path: string;
  enabledByDefault: boolean;
}

export const inventorySections: InventorySectionDefinition[] = collectorRegistry
  .list()
  .map((collector) => ({
    key: collector.key,
    category: collector.category,
    label: collector.label,
    path: collector.path,
    enabledByDefault: collector.enabledByDefault,
  }));
