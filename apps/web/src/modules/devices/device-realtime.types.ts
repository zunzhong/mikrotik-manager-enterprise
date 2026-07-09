export type HealthStatus = 'healthy' | 'warning' | 'critical';

export type HealthIssueCode =
  'CPU_HIGH' | 'MEMORY_LOW' | 'DISK_LOW' | 'TEMPERATURE_HIGH' | 'VOLTAGE_WARNING' | 'UNKNOWN';

export interface HealthIssue {
  code: HealthIssueCode;
  status: HealthStatus;
  title: string;
  message: string;
  value?: number;
  threshold?: number;
  unit?: string;
  recommendation?: string;
}

export interface HealthReport {
  score: number;
  status: HealthStatus;
  issues: HealthIssue[];
  evaluatedAt: string;
}

export interface DeviceRealtimeSnapshot {
  deviceId: string;
  collectedAt: string;
  online: boolean;
  latencyMs: number;
  error?: string;
  resource?: Record<string, unknown>;
  health?: Record<string, unknown>[];
  interfaces?: Record<string, unknown>[];
  healthReport?: HealthReport;
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
