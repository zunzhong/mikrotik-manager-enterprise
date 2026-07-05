export type RouterOsTransactionMode = 'stop-on-error' | 'continue-on-error';

export interface RouterOsBatchCommand {
  id: string;
  path: string;
  attributes?: Record<string, string | number | boolean | undefined | null>;
  description?: string;
  rollback?: RouterOsBatchCommand;
}

export interface RouterOsBatchPlan {
  id: string;
  name: string;
  mode?: RouterOsTransactionMode;
  dryRun?: boolean;
  commands: RouterOsBatchCommand[];
  createdAt?: string;
}

export interface RouterOsBatchCommandResult {
  id: string;
  path: string;
  description?: string;
  success: boolean;
  skipped?: boolean;
  dryRun?: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  error?: string;
}

export interface RouterOsBatchResult {
  id: string;
  name: string;
  success: boolean;
  dryRun: boolean;
  mode: RouterOsTransactionMode;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  results: RouterOsBatchCommandResult[];
  rollbackPlan?: RouterOsBatchPlan;
}
