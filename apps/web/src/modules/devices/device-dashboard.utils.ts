import type { InventorySnapshotSummary } from './device-inventory.types';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function snapshotSummary(snapshot: InventorySnapshotSummary | null | undefined) {
  const summary = asRecord(snapshot?.summary);
  const identity = asRecord(summary.identity);
  const resource = asRecord(summary.resource);
  const routerboard = asRecord(summary.routerboard);

  return {
    identity: text(identity.name) ?? text(summary.identityName) ?? 'Unknown Router',
    version: text(resource.version) ?? text(summary.version) ?? 'Unknown',
    architecture:
      text(resource.architectureName) ??
      text(resource.architecture) ??
      text(summary.architecture) ??
      'Unknown',
    board:
      text(routerboard.model) ?? text(resource.boardName) ?? text(summary.boardName) ?? 'Unknown',
    serial: text(routerboard.serialNumber) ?? text(summary.serialNumber),
    uptime: text(resource.uptime) ?? text(summary.uptime),
    cpuLoad: text(resource.cpuLoad) ?? text(summary.cpuLoad),
    freeMemory: text(resource.freeMemory),
    totalMemory: text(resource.totalMemory),
    freeDisk: text(resource.freeHddSpace),
    totalDisk: text(resource.totalHddSpace),
  };
}

export function formatMaybe(value: string | undefined, fallback = 'N/A'): string {
  return value && value.length > 0 ? value : fallback;
}
