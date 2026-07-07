import type { DeviceRealtimeSchedulerStatus, DeviceRealtimeSnapshot, RealtimeMetric } from './device-realtime.types';

function text(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

function safeValue(value: unknown, fallback = 'N/A'): string {
  return text(value) ?? fallback;
}

export function buildRealtimeMetrics(snapshot: DeviceRealtimeSnapshot | null): RealtimeMetric[] {
  const resource = snapshot?.resource ?? {};

  return [
    {
      label: 'Status',
      value: snapshot?.online ? 'Online' : 'Offline',
      hint: snapshot?.error,
    },
    {
      label: 'Latency',
      value: snapshot ? `${snapshot.latencyMs}ms` : 'N/A',
      hint: 'API round trip for realtime snapshot',
    },
    {
      label: 'CPU Load',
      value: safeValue(resource.cpuLoad),
      hint: 'Current resource CPU load',
    },
    {
      label: 'Uptime',
      value: safeValue(resource.uptime),
      hint: 'Router uptime',
    },
    {
      label: 'Free Memory',
      value: safeValue(resource.freeMemory),
      hint: text(resource.totalMemory) ? `Total: ${String(resource.totalMemory)}` : undefined,
    },
    {
      label: 'Free Disk',
      value: safeValue(resource.freeHddSpace),
      hint: text(resource.totalHddSpace) ? `Total: ${String(resource.totalHddSpace)}` : undefined,
    },
  ];
}

export function snapshotAge(snapshot: DeviceRealtimeSnapshot | null): string {
  if (!snapshot?.collectedAt) return 'No snapshot';
  return ageFromIso(snapshot.collectedAt);
}

export function cacheAge(snapshot: DeviceRealtimeSnapshot | null): string {
  if (snapshot?.cache?.cacheAgeMs === undefined) return snapshotAge(snapshot);

  const seconds = Math.max(0, Math.floor(snapshot.cache.cacheAgeMs / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

export function schedulerLabel(status: DeviceRealtimeSchedulerStatus | null): string {
  if (!status) return 'Unknown';
  if (status.inFlight) return 'Polling';
  return status.running ? 'Running' : 'Stopped';
}

export function ageFromIso(value: string): string {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return value;

  const ageMs = Date.now() - timestamp;
  const seconds = Math.max(0, Math.floor(ageMs / 1000));

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
