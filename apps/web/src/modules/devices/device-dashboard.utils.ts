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
      text(resource['architecture-name']) ??
      text(resource.architecture) ??
      text(summary.architecture) ??
      'Unknown',
    board:
      text(routerboard.model) ??
      text(resource.boardName) ??
      text(resource['board-name']) ??
      text(summary.boardName) ??
      'Unknown',
    serial:
      text(routerboard.serialNumber) ??
      text(routerboard['serial-number']) ??
      text(summary.serialNumber),
    uptime: text(resource.uptime) ?? text(summary.uptime),
    cpuLoad: text(resource.cpuLoad) ?? text(resource['cpu-load']) ?? text(summary.cpuLoad),
    freeMemory: text(resource.freeMemory) ?? text(resource['free-memory']),
    totalMemory: text(resource.totalMemory) ?? text(resource['total-memory']),
    freeDisk: text(resource.freeHddSpace) ?? text(resource['free-hdd-space']),
    totalDisk: text(resource.totalHddSpace) ?? text(resource['total-hdd-space']),
    cpu: text(resource.cpu),
    cpuCount: text(resource.cpuCount) ?? text(resource['cpu-count']),
    cpuFrequency: text(resource.cpuFrequency) ?? text(resource['cpu-frequency']),
    platform: text(resource.platform),
    buildTime: text(resource.buildTime) ?? text(resource['build-time']),
    factoryFirmware: text(routerboard.factoryFirmware) ?? text(routerboard['factory-firmware']),
    currentFirmware: text(routerboard.currentFirmware) ?? text(routerboard['current-firmware']),
    upgradeFirmware: text(routerboard.upgradeFirmware) ?? text(routerboard['upgrade-firmware']),
  };
}

export function formatMaybe(value: string | undefined, fallback = 'N/A'): string {
  return value && value.length > 0 ? value : fallback;
}

export function formatBytes(value: string | undefined): string {
  if (!value) return 'N/A';
  if (/[a-z]/i.test(value)) return value;
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return value;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let amount = bytes;
  let index = 0;
  while (amount >= 1024 && index < units.length - 1) {
    amount /= 1024;
    index += 1;
  }
  return `${amount >= 10 || index === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[index]}`;
}
