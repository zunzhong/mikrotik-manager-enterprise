export interface AuditRetentionInput {
  days: number;
  dryRun?: boolean;
}

export interface AuditRetentionResult {
  dryRun: boolean;
  days: number;
  cutoff: string;
  matched: number;
  deleted: number;
  generatedAt: string;
}

export function auditRetentionCutoff(days: number, now = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);

  return cutoff;
}
