import type { RouterOsClientOptions } from '../client/routeros-client.js';

export interface RouterOsPoolTarget {
  id: string;
  name: string;
  options: RouterOsClientOptions;
  priority?: number;
  enabled?: boolean;
  tags?: string[];
}

export interface RouterOsPoolHealth {
  targetId: string;
  name: string;
  online: boolean;
  latencyMs?: number;
  checkedAt: string;
  error?: string;
}

export interface RouterOsRetryPolicy {
  attempts?: number;
  delayMs?: number;
  backoffFactor?: number;
}

export interface RouterOsPoolExecutionResult<T> {
  targetId: string;
  targetName: string;
  success: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  data?: T;
  error?: string;
}
