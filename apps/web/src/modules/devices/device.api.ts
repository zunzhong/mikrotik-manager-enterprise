import { apiDelete, apiGet, apiPost, apiPut } from '../../lib/api';

export interface DeviceRecord {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  useTls: boolean;
  loginMode: string;
  status: string;
  lastSeenAt?: string;
  lastError?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DeviceInput {
  name: string;
  host: string;
  port?: number;
  username: string;
  password?: string;
  useTls?: boolean;
  loginMode?: string;
  tags?: string[];
  groupId?: string | null;
}

export interface RouterOsProbeInput {
  host: string;
  port?: number;
  username: string;
  password: string;
  useTls?: boolean;
  timeoutMs?: number;
}

export interface RouterOsProbeResult {
  online: boolean;
  latencyMs?: number;
  identity?: string;
  version?: string;
  architecture?: string;
  boardName?: string;
  serialNumber?: string;
  uptime?: string;
  error?: string;
  raw?: Record<string, unknown>;
}

export const deviceApi = {
  list: () => apiGet<DeviceRecord[]>('/api/v1/devices'),
  get: (id: string) => apiGet<DeviceRecord>(`/api/v1/devices/${id}`),
  create: (input: DeviceInput) => apiPost<DeviceRecord>('/api/v1/devices', input),
  update: (id: string, input: Partial<DeviceInput>) => apiPut<DeviceRecord>(`/api/v1/devices/${id}`, input),
  delete: (id: string) => apiDelete<DeviceRecord>(`/api/v1/devices/${id}`),
  test: (input: RouterOsProbeInput) => apiPost<RouterOsProbeResult>('/api/v1/device/test', input),
  probe: (input: RouterOsProbeInput) => apiPost<RouterOsProbeResult>('/api/v1/device/probe', input),
  status: (id: string) => apiGet<RouterOsProbeResult>(`/api/v1/device/${id}/status`),
};
