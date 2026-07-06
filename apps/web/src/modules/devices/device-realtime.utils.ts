import type { InventorySnapshotSummary } from './device-inventory.types';
import { snapshotSummary } from './device-dashboard.utils';

export interface RealtimeMetric {
  label: string;
  value: string;
  hint?: string;
}

function safeValue(value: string | undefined, fallback = 'N/A'): string {
  return value && value.length > 0 ? value : fallback;
}

export function buildRealtimeMetrics(snapshot: InventorySnapshotSummary | null): RealtimeMetric[] {
  const summary = snapshotSummary(snapshot);

  return [
    {
      label: 'RouterOS',
      value: safeValue(summary.version),
      hint: 'Detected from latest inventory snapshot',
    },
    {
      label: 'CPU Load',
      value: safeValue(summary.cpuLoad),
      hint: 'Current resource CPU load',
    },
    {
      label: 'Uptime',
      value: safeValue(summary.uptime),
      hint: 'Router uptime',
    },
    {
      label: 'Architecture',
      value: safeValue(summary.architecture),
      hint: 'RouterOS architecture',
    },
    {
      label: 'Free Memory',
      value: safeValue(summary.freeMemory),
      hint: summary.totalMemory ? `Total: ${summary.totalMemory}` : undefined,
    },
    {
      label: 'Free Disk',
      value: safeValue(summary.freeDisk),
      hint: summary.totalDisk ? `Total: ${summary.totalDisk}` : undefined,
    },
  ];
}

export function snapshotAge(snapshot: InventorySnapshotSummary | null): string {
  if (!snapshot?.collectedAt) return 'No snapshot';

  const collectedAt = new Date(snapshot.collectedAt).getTime();
  if (Number.isNaN(collectedAt)) return snapshot.collectedAt;

  const ageMs = Date.now() - collectedAt;
  const seconds = Math.max(0, Math.floor(ageMs / 1000));

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
