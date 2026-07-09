import { apiDelete, apiGet, apiPatch, apiPost } from '../../lib/api';
import type {
  DeviceActionResult,
  DeviceFileActionInput,
  DevicePingInput,
} from './device-action.types';
import type {
  InventoryCollectResult,
  InventorySectionDetail,
  InventorySnapshotDetail,
  InventorySnapshotSummary,
} from './device-inventory.types';
import type {
  DeviceRealtimeOverview,
  DeviceRealtimeSchedulerStatus,
  DeviceRealtimeSnapshot,
} from './device-realtime.types';
import type {
  Device,
  DeviceInput,
  DeviceSyncSnapshot,
  RouterOsInventorySnapshot,
  RouterOsProbeInput,
  RouterOsProbeResult,
} from './device.types';

const explicitApiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

function normalizeProbeInput(input: RouterOsProbeInput): RouterOsProbeInput {
  const tls = input.tls ?? input.useTls ?? false;
  return {
    ...input,
    tls,
    port: input.port ?? (tls ? 8729 : 8728),
    timeoutMs: input.timeoutMs ?? 10000,
  };
}

function buildApiUrl(path: string): string {
  return explicitApiBaseUrl && explicitApiBaseUrl.length > 0
    ? `${explicitApiBaseUrl}${path}`
    : path;
}

export const deviceApi = {
  list: () => apiGet<Device[]>('/api/v1/devices'),

  get: (id: string) => apiGet<Device>(`/api/v1/devices/${id}`),

  create: (input: DeviceInput) => apiPost<Device>('/api/v1/devices', input),

  update: (id: string, input: Partial<DeviceInput>) =>
    apiPatch<Device>(`/api/v1/devices/${id}`, input),

  delete: (id: string) => apiDelete<void>(`/api/v1/devices/${id}`),

  getRealtimeOverview: () => apiGet<DeviceRealtimeOverview>('/api/v1/realtime/devices'),

  getRealtimeSchedulerStatus: () =>
    apiGet<DeviceRealtimeSchedulerStatus>('/api/v1/realtime/scheduler/status'),

  startRealtimeScheduler: (input: { intervalMs?: number; ttlMs?: number } = {}) =>
    apiPost<DeviceRealtimeSchedulerStatus>('/api/v1/realtime/scheduler/start', input),

  stopRealtimeScheduler: () =>
    apiPost<DeviceRealtimeSchedulerStatus>('/api/v1/realtime/scheduler/stop'),

  getRealtimeSnapshot: (id: string) =>
    apiGet<DeviceRealtimeSnapshot>(`/api/v1/realtime/devices/${id}`),

  refreshRealtimeSnapshot: (id: string) =>
    apiPost<DeviceRealtimeSnapshot>(`/api/v1/realtime/devices/${id}/refresh`),

  realtimeStreamUrl: (id: string) => buildApiUrl(`/api/v1/realtime/devices/${id}/stream`),

  pingDevice: (id: string, input: DevicePingInput = {}) =>
    apiPost<DeviceActionResult>(`/api/v1/devices/${id}/actions/ping`, input),

  createBackup: (id: string, input: DeviceFileActionInput = {}) =>
    apiPost<DeviceActionResult>(`/api/v1/devices/${id}/actions/backup`, input),

  generateSupout: (id: string, input: DeviceFileActionInput = {}) =>
    apiPost<DeviceActionResult>(`/api/v1/devices/${id}/actions/supout`, input),

  rebootDevice: (id: string, confirm: boolean) =>
    apiPost<DeviceActionResult>(`/api/v1/devices/${id}/actions/reboot`, { confirm }),

  probe: (input: RouterOsProbeInput) =>
    apiPost<RouterOsProbeResult>('/api/v1/routeros/probe', normalizeProbeInput(input)),

  inventory: (input: RouterOsProbeInput) =>
    apiPost<RouterOsInventorySnapshot>('/api/v1/routeros/inventory', normalizeProbeInput(input)),

  sync: (input: RouterOsProbeInput) =>
    apiPost<DeviceSyncSnapshot>('/api/v1/routeros/sync', normalizeProbeInput(input)),

  identity: (input: RouterOsProbeInput) =>
    apiPost<Record<string, unknown>>('/api/v1/routeros/identity', normalizeProbeInput(input)),

  resource: (input: RouterOsProbeInput) =>
    apiPost<Record<string, unknown>>('/api/v1/routeros/resource', normalizeProbeInput(input)),

  routerboard: (input: RouterOsProbeInput) =>
    apiPost<Record<string, unknown>>('/api/v1/routeros/routerboard', normalizeProbeInput(input)),

  collectInventory: (deviceId: string) =>
    apiPost<InventoryCollectResult>(`/api/v1/devices/${deviceId}/inventory/collect`),

  inventorySnapshots: (deviceId: string) =>
    apiGet<InventorySnapshotSummary[]>(`/api/v1/devices/${deviceId}/inventory/snapshots`),

  latestInventorySnapshot: (deviceId: string) =>
    apiGet<InventorySnapshotSummary | null>(
      `/api/v1/devices/${deviceId}/inventory/snapshots/latest`,
    ),

  inventorySnapshot: (snapshotId: string) =>
    apiGet<InventorySnapshotDetail>(`/api/v1/inventory/snapshots/${snapshotId}`),

  inventorySnapshotSections: (snapshotId: string) =>
    apiGet<InventorySectionDetail[]>(`/api/v1/inventory/snapshots/${snapshotId}/sections`),

  test: (input: RouterOsProbeInput) =>
    apiPost<RouterOsProbeResult>('/api/v1/routeros/probe', normalizeProbeInput(input)),

  status: (id: string) => apiGet<RouterOsProbeResult>(`/api/v1/device/${id}/status`),
};

export type {
  DeviceActionResult,
  DeviceFileActionInput,
  DevicePingInput,
} from './device-action.types';

export type {
  InventoryCollectResult,
  InventoryItem,
  InventorySectionDetail,
  InventorySectionSummary,
  InventorySnapshotDetail,
  InventorySnapshotSummary,
} from './device-inventory.types';

export type {
  DeviceRealtimeOverview,
  DeviceRealtimeSchedulerStatus,
  DeviceRealtimeSnapshot,
  DeviceRealtimeStreamState,
  RealtimeMetric,
} from './device-realtime.types';

export type {
  Device,
  DeviceInput,
  DeviceSyncSnapshot,
  RouterOsInventorySnapshot,
  RouterOsProbeInput,
  RouterOsProbeResult,
} from './device.types';
