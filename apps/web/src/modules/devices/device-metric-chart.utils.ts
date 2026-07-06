import type { InventorySnapshotSummary } from './device-inventory.types';
import { snapshotSummary } from './device-dashboard.utils';

export interface DeviceMetricBar {
  label: string;
  valueText: string;
  percent: number;
  hint?: string;
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const normalized = value.replace(/[^0-9.]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function percentFromFree(free: string | undefined, total: string | undefined): number | undefined {
  const freeValue = parseNumber(free);
  const totalValue = parseNumber(total);

  if (freeValue === undefined || totalValue === undefined || totalValue <= 0) return undefined;

  const used = Math.max(0, totalValue - freeValue);
  return Math.min(100, Math.round((used / totalValue) * 100));
}

function clampPercent(value: number | undefined): number {
  if (value === undefined || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function buildDeviceMetricBars(snapshot: InventorySnapshotSummary | null): DeviceMetricBar[] {
  const summary = snapshotSummary(snapshot);
  const cpu = clampPercent(parseNumber(summary.cpuLoad));
  const memoryPercent = percentFromFree(summary.freeMemory, summary.totalMemory);
  const diskPercent = percentFromFree(summary.freeDisk, summary.totalDisk);

  return [
    {
      label: 'CPU Load',
      valueText: summary.cpuLoad ?? 'N/A',
      percent: cpu,
      hint: 'Latest resource snapshot',
    },
    {
      label: 'Memory Used',
      valueText:
        summary.freeMemory && summary.totalMemory
          ? `${summary.freeMemory} free / ${summary.totalMemory} total`
          : 'N/A',
      percent: clampPercent(memoryPercent),
      hint: memoryPercent === undefined ? 'Missing total/free memory data' : undefined,
    },
    {
      label: 'Disk Used',
      valueText:
        summary.freeDisk && summary.totalDisk
          ? `${summary.freeDisk} free / ${summary.totalDisk} total`
          : 'N/A',
      percent: clampPercent(diskPercent),
      hint: diskPercent === undefined ? 'Missing total/free disk data' : undefined,
    },
  ];
}

export function buildDeviceFacts(snapshot: InventorySnapshotSummary | null) {
  const summary = snapshotSummary(snapshot);

  return [
    { label: 'RouterOS', value: summary.version ?? 'N/A' },
    { label: 'Architecture', value: summary.architecture ?? 'N/A' },
    { label: 'Board', value: summary.board ?? 'N/A' },
    { label: 'Serial', value: summary.serial ?? 'N/A' },
    { label: 'Uptime', value: summary.uptime ?? 'N/A' },
  ];
}
