import type { RouterClient } from '@mme/routeros-core';

export interface InventoryCollectorContext {
  deviceId: string;
  client: RouterClient;
}

export interface InventoryCollectorResult {
  key: string;
  category: string;
  label: string;
  path: string;
  rows: Array<Record<string, string>>;
  success: boolean;
  error?: string;
}

export interface InventoryCollector {
  key: string;
  category: string;
  label: string;
  path: string;
  enabledByDefault: boolean;
  optional: boolean;
  collect(context: InventoryCollectorContext): Promise<InventoryCollectorResult>;
}
