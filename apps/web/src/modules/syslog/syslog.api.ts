import { apiDelete, apiGet, apiPost, apiPut, buildApiUrl, mergeHeaders } from '../../lib/api';
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

function responseFileName(response: Response, fallback: string): string {
  const disposition = response.headers.get('content-disposition') ?? '';
  const matched = /filename="?([^";]+)"?/i.exec(disposition);
  return matched?.[1] ?? fallback;
}

async function downloadDailyFile(deviceId: string, date: string): Promise<string> {
  const path = `/api/v1/syslog/files/${encodeURIComponent(deviceId)}/${encodeURIComponent(date)}/download`;
  const response = await fetch(buildApiUrl(path), {
    headers: mergeHeaders({ Accept: 'text/plain' }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string | { message?: string };
    } | null;
    const message =
      typeof body?.error === 'string'
        ? body.error
        : (body?.error?.message ?? `Unable to download Syslog file (${response.status}).`);
    throw new Error(message);
  }
  const fileName = responseFileName(response, `syslog_${date}.log`);
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return fileName;
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
  downloadDaily: downloadDailyFile,
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
