import type { InventoryCollector, InventoryCollectorContext, InventoryCollectorResult } from './collector.types.js';

export interface RouterOsPrintCollectorOptions {
  key: string;
  category: string;
  label: string;
  path: string;
  enabledByDefault?: boolean;
}

export class RouterOsPrintCollector implements InventoryCollector {
  public readonly key: string;
  public readonly category: string;
  public readonly label: string;
  public readonly path: string;
  public readonly enabledByDefault: boolean;

  public constructor(options: RouterOsPrintCollectorOptions) {
    this.key = options.key;
    this.category = options.category;
    this.label = options.label;
    this.path = options.path;
    this.enabledByDefault = options.enabledByDefault ?? true;
  }

  public async collect(context: InventoryCollectorContext): Promise<InventoryCollectorResult> {
    try {
      const response = await context.client.command(this.path);
      return {
        key: this.key,
        category: this.category,
        label: this.label,
        path: this.path,
        rows: response.rows,
        success: true,
      };
    } catch (error) {
      return {
        key: this.key,
        category: this.category,
        label: this.label,
        path: this.path,
        rows: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown collector error',
      };
    }
  }
}
