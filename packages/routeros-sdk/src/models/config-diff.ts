export interface RouterOsConfigItem {
  key: string;
  path: string;
  id?: string;
  name?: string;
  attributes: Record<string, string | undefined>;
}

export interface RouterOsConfigSnapshot {
  id: string;
  name: string;
  collectedAt: string;
  deviceIdentity?: string;
  items: RouterOsConfigItem[];
}

export type RouterOsConfigDiffType = 'added' | 'removed' | 'changed';

export interface RouterOsConfigChange {
  type: RouterOsConfigDiffType;
  key: string;
  path: string;
  before?: RouterOsConfigItem;
  after?: RouterOsConfigItem;
  changedAttributes?: Record<string, {
    before?: string;
    after?: string;
  }>;
}

export interface RouterOsConfigDiff {
  id: string;
  sourceSnapshotId: string;
  targetSnapshotId: string;
  createdAt: string;
  changes: RouterOsConfigChange[];
}

export interface RouterOsSyncPlan {
  id: string;
  name: string;
  createdAt: string;
  dryRun?: boolean;
  changes: RouterOsConfigChange[];
}

export interface RouterOsSyncResult {
  id: string;
  name: string;
  dryRun: boolean;
  success: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  applied: number;
  skipped: number;
  errors: Array<{
    key: string;
    error: string;
  }>;
}
