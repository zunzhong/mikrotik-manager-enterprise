export type RouterOsBackupKind = 'binary-backup' | 'export-rsc';

export interface RouterOsBackupJob {
  id: string;
  name: string;
  kind: RouterOsBackupKind;
  fileName: string;
  includeSensitive?: boolean;
  compact?: boolean;
  createdAt?: string;
}

export interface RouterOsBackupReport {
  id: string;
  name: string;
  kind: RouterOsBackupKind;
  fileName: string;
  success: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  error?: string;
}

export interface RouterOsRestorePlan {
  id: string;
  name: string;
  fileName: string;
  kind: RouterOsBackupKind;
  dryRun?: boolean;
  rebootAfterRestore?: boolean;
}
