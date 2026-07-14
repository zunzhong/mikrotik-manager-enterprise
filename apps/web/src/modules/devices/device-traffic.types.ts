export type TrafficPeriod = 'hour' | 'day' | 'month' | 'year';

export interface TrafficBucket {
  key: string;
  label: string;
  from: string;
  rxBytes: number;
  txBytes: number;
  totalBytes: number;
}

export interface DeviceTrafficHistory {
  deviceId: string;
  period: TrafficPeriod;
  interfaceName: string;
  from: string;
  to: string;
  interfaces: string[];
  current: {
    interfaceName: string;
    rxBps: number;
    txBps: number;
    running: boolean;
    collectedAt: string;
  } | null;
  totals: { rxBytes: number; txBytes: number; totalBytes: number };
  buckets: TrafficBucket[];
}
