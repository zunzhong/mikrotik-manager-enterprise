import { apiDelete, apiGet, apiPost, apiPut } from '../../lib/api';
import type {
  InventoryCollectResult,
  InventorySectionDetail,
  InventorySnapshotDetail,
  InventorySnapshotSummary,
} from './device-inventory.types';
import type {
  Device,
  DeviceInput,
  DeviceSyncSnapshot,
  RouterOsInventorySnapshot,
  RouterOsProbeInput,
  RouterOsProbeResult,
} from './device.types';

function normalizeProbeInput(input: RouterOsProbeInput): RouterOsProbeInput {
  const tls = input.tls ?? input.useTls ?? false;
  return {
    ...input,
    tls,
    port: input.port ?? (tls ? 8729 : 8728),
    timeoutMs: input.timeoutMs ?? 10000,
  };
}

export const deviceApi = {
  list: () => apiGet<Device[]>('/api/v1/devices'),

  get: (id: string) => apiGet<Device>(`/api/v1/devices/${id}`),

  create: (input: DeviceInput) => apiPost<Device>('/api/v1/devices', input),

  update: (id: string, input: Partial<DeviceInput>) =>
    apiPut<Device>(`/api/v1/devices/${id}`, input),

  delete: (id: string) => apiDelete<void>(`/api/v1/devices/${id}`),

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
    apiGet<InventorySnapshotSummary | null>(`/api/v1/devices/${deviceId}/inventory/snapshots/latest`),

  inventorySnapshot: (snapshotId: string) =>
    apiGet<InventorySnapshotDetail>(`/api/v1/inventory/snapshots/${snapshotId}`),

  inventorySnapshotSections: (snapshotId: string) =>
    apiGet<InventorySectionDetail[]>(`/api/v1/inventory/snapshots/${snapshotId}/sections`),

  test: (input: RouterOsProbeInput) =>
    apiPost<RouterOsProbeResult>('/api/v1/routeros/probe', normalizeProbeInput(input)),

  status: (id: string) => apiGet<RouterOsProbeResult>(`/api/v1/device/${id}/status`),
};

export type {
  InventoryCollectResult,
  InventoryItem,
  InventorySectionDetail,
  InventorySectionSummary,
  InventorySnapshotDetail,
  InventorySnapshotSummary,
} from './device-inventory.types';

export type {
  Device,
  DeviceInput,
  DeviceSyncSnapshot,
  RouterOsInventorySnapshot,
  RouterOsProbeInput,
  RouterOsProbeResult,
} from './device.types';
