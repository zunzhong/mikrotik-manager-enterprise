import type { RouterOsBackupJob, RouterOsRestorePlan } from '../models/backup.js';

export function createBinaryBackupJob(name: string, fileName?: string): RouterOsBackupJob {
  const safeName = fileName ?? `${name}-${new Date().toISOString().replace(/[:.]/g, '-')}`;

  return {
    id: `backup-${Date.now()}`,
    name,
    kind: 'binary-backup',
    fileName: safeName,
    createdAt: new Date().toISOString(),
  };
}

export function createExportJob(
  name: string,
  fileName?: string,
  includeSensitive = false,
): RouterOsBackupJob {
  const safeName = fileName ?? `${name}-${new Date().toISOString().replace(/[:.]/g, '-')}`;

  return {
    id: `export-${Date.now()}`,
    name,
    kind: 'export-rsc',
    fileName: safeName,
    includeSensitive,
    compact: true,
    createdAt: new Date().toISOString(),
  };
}

export function createRestorePlan(input: {
  name: string;
  fileName: string;
  kind: 'binary-backup' | 'export-rsc';
  dryRun?: boolean;
  rebootAfterRestore?: boolean;
}): RouterOsRestorePlan {
  return {
    id: `restore-${Date.now()}`,
    name: input.name,
    fileName: input.fileName,
    kind: input.kind,
    dryRun: input.dryRun,
    rebootAfterRestore: input.rebootAfterRestore,
  };
}
