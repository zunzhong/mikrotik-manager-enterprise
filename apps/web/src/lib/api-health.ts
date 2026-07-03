import { apiGet } from './api';

export interface ApiHealth {
  status: string;
  name: string;
  version: string;
  environment?: string;
  uptime?: number;
}

export function getApiHealth() {
  return apiGet<ApiHealth>('/api/v1/health');
}
