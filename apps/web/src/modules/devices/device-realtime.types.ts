export interface DeviceRealtimeSnapshot {
  deviceId: string;
  collectedAt: string;
  online: boolean;
  latencyMs: number;
  error?: string;
  resource?: Record<string, unknown>;
  health?: Record<string, unknown>[];
  interfaces?: Record<string, unknown>[];
}

export interface RealtimeMetric {
  label: string;
  value: string;
  hint?: string;
}
