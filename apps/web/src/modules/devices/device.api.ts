import { apiGet } from '../../lib/api';

export interface Device {
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

export const deviceApi = {
  list: () => apiGet<Device[]>('/api/v1/devices'),
};
