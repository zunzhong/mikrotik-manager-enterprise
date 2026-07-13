import { apiGet } from '../../lib/api';

export interface DashboardSummary {
  devices: {
    total: number;
    online: number;
    offline: number;
    degraded: number;
    unknown: number;
  };
  alerts: {
    open: number;
    critical: number;
  };
  compliance: {
    averageScore: number;
  };
  inventory: {
    snapshots: number;
  };
}

export interface DashboardDevices {
  byStatus: Array<{ status: string; count: number }>;
  recent: Array<{
    id: string;
    name: string;
    host: string;
    status: string;
    lastSeenAt?: string;
    lastError?: string;
    updatedAt: string;
  }>;
}

export interface DashboardAlerts {
  bySeverity: Array<{ severity: string; count: number }>;
  recent: Array<{
    id: string;
    severity: string;
    status: string;
    title: string;
    message: string;
    createdAt: string;
  }>;
}

export interface DashboardCompliance {
  totals: {
    recent: number;
    passed: number;
    failed: number;
  };
  recent: Array<{
    id: string;
    status: string;
    score: number;
    createdAt: string;
    device?: {
      id: string;
      name: string;
      host: string;
    };
  }>;
}

export interface DashboardInventory {
  totals: {
    snapshots: number;
    sections: number;
    items: number;
    diffs: number;
  };
  recentSnapshots: Array<{
    id: string;
    collectedAt: string;
    status: string;
    source: string;
    device?: {
      id: string;
      name: string;
      host: string;
    };
  }>;
}

export interface DashboardActivity {
  id: string;
  type: string;
  title: string;
  entity: string;
  entityId?: string;
  createdAt: string;
  data?: unknown;
}

export const dashboardApi = {
  summary: () => apiGet<DashboardSummary>('/api/v1/dashboard/summary'),
  devices: () => apiGet<DashboardDevices>('/api/v1/dashboard/devices'),
  alerts: () => apiGet<DashboardAlerts>('/api/v1/dashboard/alerts'),
  compliance: () => apiGet<DashboardCompliance>('/api/v1/dashboard/compliance'),
  inventory: () => apiGet<DashboardInventory>('/api/v1/dashboard/inventory'),
  activity: () => apiGet<DashboardActivity[]>('/api/v1/dashboard/activity'),
};
