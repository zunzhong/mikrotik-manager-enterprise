import { apiGet, apiPost } from '../../lib/api';

export interface DeviceInventoryOverview {
  deviceId: string;
  hasSnapshot: boolean;
  snapshot: null | {
    id: string;
    collectedAt: string;
    source: string;
    status: string;
    summary?: unknown;
  };
  totals: {
    sections: number;
    items: number;
    categories: number;
  };
  latestDiff: null | {
    id: string;
    createdAt: string;
    changeCount: number;
    summary?: unknown;
  };
}

export interface DeviceInventoryTree {
  deviceId: string;
  snapshot: null | {
    id: string;
    collectedAt: string;
    source: string;
    status: string;
  };
  categories: Array<{
    category: string;
    sectionCount: number;
    itemCount: number;
    sections: Array<{
      id: string;
      name: string;
      path: string;
      itemCount: number;
    }>;
  }>;
}

export interface DeviceInventorySection {
  id: string;
  name: string;
  category: string;
  path: string;
  itemCount: number;
  items: Array<{
    id: string;
    externalId?: string;
    name?: string;
    disabled?: boolean;
    raw: Record<string, unknown>;
  }>;
}

export const deviceInventoryApi = {
  overview: (deviceId: string) =>
    apiGet<DeviceInventoryOverview>(`/api/v1/devices/${deviceId}/inventory/overview`),

  tree: (deviceId: string) =>
    apiGet<DeviceInventoryTree>(`/api/v1/devices/${deviceId}/inventory/tree`),

  section: (deviceId: string, sectionId: string) =>
    apiGet<DeviceInventorySection>(`/api/v1/devices/${deviceId}/inventory/sections/${sectionId}`),

  collect: (deviceId: string) =>
    apiPost(`/api/v1/devices/${deviceId}/inventory/collect`, {}),

  diffLatest: (deviceId: string) =>
    apiPost(`/api/v1/devices/${deviceId}/inventory/diff-latest`, {}),
};
