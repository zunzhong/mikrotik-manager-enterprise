import { apiGet } from '../../lib/api';

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
  metadata?: unknown;
}

export interface TopologyData {
  nodes: TopologyNode[];
  links: TopologyLink[];
  summary: {
    nodes: number;
    links: number;
    devices: number;
  };
}

export const topologyApi = {
  get: () => apiGet<TopologyData>('/api/v1/topology'),
};
