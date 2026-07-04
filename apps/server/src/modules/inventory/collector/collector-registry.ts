import type { InventoryCollector } from './collector.types.js';

export class CollectorRegistry {
  private readonly collectors = new Map<string, InventoryCollector>();

  public register(collector: InventoryCollector): void {
    if (this.collectors.has(collector.key)) {
      throw new Error(`Inventory collector already registered: ${collector.key}`);
    }
    this.collectors.set(collector.key, collector);
  }

  public registerMany(collectors: InventoryCollector[]): void {
    for (const collector of collectors) this.register(collector);
  }

  public list(): InventoryCollector[] {
    return [...this.collectors.values()];
  }

  public enabledByDefault(): InventoryCollector[] {
    return this.list().filter((collector) => collector.enabledByDefault);
  }
}

export const collectorRegistry = new CollectorRegistry();
