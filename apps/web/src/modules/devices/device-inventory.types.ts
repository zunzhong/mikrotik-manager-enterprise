export interface InventorySnapshotSummary {
  id: string;
  deviceId: string;
  collectedAt: string;
  source: string;
  status: string;
  summary?: Record<string, unknown> | null;
  sectionCount: number;
  itemCount: number;
  sections: InventorySectionSummary[];
}

export interface InventorySectionSummary {
  id: string;
  name: string;
  category: string;
  path: string;
  itemCount: number;
}

export interface InventorySnapshotDetail {
  id: string;
  deviceId: string;
  collectedAt: string;
  source: string;
  status: string;
  summary?: Record<string, unknown> | null;
  device?: {
    id: string;
    name: string;
    host: string;
    status: string;
  };
  sections: InventorySectionDetail[];
}

export interface InventorySectionDetail {
  id: string;
  snapshotId: string;
  name: string;
  category: string;
  path: string;
  itemCount: number;
  raw?: unknown;
  items?: InventoryItem[];
}

export interface InventoryItem {
  id: string;
  sectionId: string;
  externalId?: string | null;
  name?: string | null;
  disabled?: boolean | null;
  raw: Record<string, unknown>;
}

export interface InventoryCollectResult {
  snapshotId: string;
  deviceId: string;
  collectorsPlanned: number;
  sectionsCollected: number;
  failedCollectors: Array<{
    key?: string;
    path?: string;
    error?: string;
  }>;
  errorCode?: string;
  error?: string;
}
