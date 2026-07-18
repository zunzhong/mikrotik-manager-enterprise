import { apiDelete, apiGet, apiPost, apiPut } from '../../lib/api';

export type TopologyConfidence = 'confirmed' | 'inferred' | 'unresolved' | 'manual';

export interface TopologyEvidence {
  source: 'neighbor' | 'bridge-host' | 'wifi' | 'ospf' | 'arp' | 'dhcp' | 'manual';
  path: string;
  deviceId?: string;
  observedAt: string;
  weight: number;
  localInterface?: string;
  remoteInterface?: string;
  details: Record<string, string>;
}

export interface TopologyNode {
  id: string;
  label: string;
  host?: string | null;
  status: string;
  type: string;
  managed: boolean;
  deviceId?: string;
  identity?: string;
  ipAddress?: string;
  macAddress?: string;
  model?: string;
  platform?: string;
  version?: string;
  serialNumber?: string;
  lastSeenAt?: string | null;
  sourceDeviceIds: string[];
  metrics?: {
    cpuLoadPercent?: number;
    memoryUsagePercent?: number;
    temperatureCelsius?: number;
    uptime?: string;
    rxBps?: number;
    txBps?: number;
    trafficInterface?: string;
  };
}

export interface TopologyLink {
  id: string;
  source: string;
  target: string;
  label: string;
  managed: boolean;
  type: 'wired' | 'wireless' | 'routing' | 'manual' | 'unknown';
  confidence: TopologyConfidence;
  confidenceScore: number;
  status: 'active' | 'stale' | 'manual';
  lastObservedAt: string;
  evidence: TopologyEvidence[];
}

export interface TopologySummary {
  nodes: number;
  links: number;
  devices: number;
  managedLinks: number;
  connectedDevices: number;
  isolatedDevices: number;
  confirmedLinks: number;
  inferredLinks: number;
  unresolvedLinks: number;
  manualLinks: number;
  evidenceSources: number;
}

export interface TopologyData {
  nodes: TopologyNode[];
  links: TopologyLink[];
  managedDevices: TopologyNode[];
  summary: TopologySummary;
  scope: string;
  generatedAt: string;
  layout: Record<string, { x: number; y: number }>;
  historyCapture?: { captured: boolean; graphHash: string };
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

export interface TopologyHistoryItem {
  id: string;
  graphHash: string;
  summary: TopologySummary;
  collectedAt: string;
}

export const topologyApi = {
  get: (deviceId?: string) =>
    apiGet<TopologyData>(
      deviceId ? `/api/v1/topology/devices/${encodeURIComponent(deviceId)}` : '/api/v1/topology',
    ),
  refresh: () => apiPost<TopologyData>('/api/v1/topology/refresh'),
  refreshDevice: (deviceId: string) =>
    apiPost<TopologyData>(`/api/v1/topology/devices/${encodeURIComponent(deviceId)}/refresh`),
  saveLayout: (deviceId: string | undefined, layout: Record<string, { x: number; y: number }>) =>
    apiPut<{ scope: string; saved: number }>('/api/v1/topology/layout', {
      deviceId,
      positions: Object.entries(layout).map(([nodeId, position]) => ({ nodeId, ...position })),
    }),
  history: (deviceId?: string) =>
    apiGet<TopologyHistoryItem[]>(
      `/api/v1/topology/history${deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : ''}`,
    ),
  createManualLink: (input: { sourceNodeId: string; targetNodeId: string; label?: string }) =>
    apiPost('/api/v1/topology/links/manual', input),
  deleteManualLink: (id: string) =>
    apiDelete<{ deleted: boolean; id: string }>(
      `/api/v1/topology/links/manual/${encodeURIComponent(id)}`,
    ),
};
