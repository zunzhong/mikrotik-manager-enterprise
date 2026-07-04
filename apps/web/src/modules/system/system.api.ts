import { apiGet } from '../../lib/api';

export interface SystemStatus {
  service: {
    name: string;
    version: string;
    node: string;
    environment: string;
  };
  health: {
    live: boolean;
    ready: boolean;
    checks: Array<{
      name: string;
      status: string;
      message?: string;
    }>;
  };
  metrics: {
    devices: number;
    openAlerts: number;
    inventorySnapshots: number;
  };
  timestamp: string;
}

export const systemApi = {
  status: () => apiGet<SystemStatus>('/api/v1/system/status'),
};
