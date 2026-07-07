export interface DeviceRealtimeSnapshot {
  deviceId: string;
  collectedAt: string;
  online: boolean;
  latencyMs: number;
  error?: string;
  resource?: Record<string, unknown>;
  health?: Record<string, unknown>[];
  interfaces?: Record<string, unknown>[];
  cache?: {
    source: 'manual' | 'scheduler' | 'cache-miss';
    expiresAt: string;
    cacheAgeMs: number;
    lastPollAt: string;
    nextPollAt?: string;
    pollIntervalMs?: number;
  };
}

export interface DeviceRealtimeSchedulerStatus {
  running: boolean;
  intervalMs: number;
  ttlMs: number;
  deviceCount: number;
  inFlight: boolean;
  startedAt?: string;
  stoppedAt?: string;
  lastRunAt?: string;
  nextRunAt?: string;
  lastRunDurationMs?: number;
  lastError?: string;
}

export interface DeviceRealtimeOverview {
  scheduler: DeviceRealtimeSchedulerStatus;
  devices: DeviceRealtimeSnapshot[];
}

export interface RealtimeMetric {
  label: string;
  value: string;
  hint?: string;
}

export interface DeviceRealtimeStreamState {
  enabled: boolean;
  connected: boolean;
  lastEventAt?: string;
  error?: string;
}
