import { apiDelete, apiGet, apiPost, apiPut } from '../../lib/api';
import type {
  RouterOsSyslogResult,
  SyslogFilters,
  SyslogMessagePage,
  SyslogOverview,
  SyslogReceiverStatus,
  SyslogSettings,
} from './syslog.types';

function queryString(filters: SyslogFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return params.toString();
}

export const syslogApi = {
  overview: () => apiGet<SyslogOverview>('/api/v1/syslog/overview'),
  messages: (filters: SyslogFilters) =>
    apiGet<SyslogMessagePage>(`/api/v1/syslog/messages?${queryString(filters)}`),
  saveSettings: (settings: SyslogSettings) =>
    apiPut<{ settings: SyslogSettings; receiver: SyslogReceiverStatus }>(
      '/api/v1/syslog/settings',
      settings,
    ),
  test: () =>
    apiPost<{ success: boolean; message: string; receiver: SyslogReceiverStatus }>(
      '/api/v1/syslog/test',
      {},
    ),
  addAlias: (alias: string, deviceId: string) =>
    apiPost('/api/v1/syslog/aliases', { alias, deviceId }),
  deleteAlias: (id: string) => apiDelete(`/api/v1/syslog/aliases/${id}`),
  purge: () =>
    apiPost<{ expired: number; overflow: number; total: number; cutoff: string }>(
      '/api/v1/syslog/purge',
      {},
    ),
  clear: () => apiPost<{ deleted: number }>('/api/v1/syslog/clear', { confirm: true }),
  configureRouterOs: (input: {
    deviceIds: string[];
    serverAddress: string;
    port: number;
    topics: string;
    confirm: true;
  }) =>
    apiPost<{
      results: RouterOsSyslogResult[];
      succeeded: number;
      failed: number;
    }>('/api/v1/syslog/routeros/configure', input),
};
