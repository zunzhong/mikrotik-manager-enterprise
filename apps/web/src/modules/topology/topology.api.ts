import { apiGet, apiPost } from '../../lib/api';

export interface TopologyNode {
  id: string;
  label: string;
  host?: string;
  status: string;
  type: string;
  lastSeenAt?: string;
}

export interface TopologyLink {
  id: string;
  source: string;
  target: string;
  label?: string;
  managed: boolean;
  metadata?: unknown;
}

export interface TopologyData {
  nodes: TopologyNode[];
  links: TopologyLink[];
  summary: {
    nodes: number;
    links: number;
    devices: number;
    managedLinks: number;
    connectedDevices: number;
    isolatedDevices: number;
  };
  inventoryScheduler: {
    running: boolean;
    intervalMs: number;
    inFlight: boolean;
    deviceCount: number;
    lastRunAt?: string;
    nextRunAt?: string;
    lastError?: string;
  };
}

export const topologyApi = {
  get: () => apiGet<TopologyData>('/api/v1/topology'),
  refresh: () => apiPost<TopologyData>('/api/v1/topology/refresh'),
  refreshDevice: (deviceId: string) =>
    apiPost<TopologyData>(`/api/v1/topology/devices/${deviceId}/refresh`),
};
