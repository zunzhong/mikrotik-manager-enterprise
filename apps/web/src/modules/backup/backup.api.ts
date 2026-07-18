import { apiDelete, apiGet, apiPost, apiPut, buildApiUrl, mergeHeaders } from '../../lib/api';

export interface BackupRecord {
  id: string;
  deviceId: string;
  type: string;
  status: string;
  fileName: string;
  filePath?: string;
  sizeBytes?: number;
  checksum?: string;
  metadata?: unknown;
  error?: string;
  createdAt: string;
  completedAt?: string;
  storage?: { exists: boolean; sizeBytes?: number; modifiedAt?: string };
}

export interface BackupValidation {
  valid: boolean;
  type: string;
  status: string;
  warnings: string[];
}

export interface BackupSchedule {
  id: string;
  deviceId: string;
  enabled: boolean;
  type: 'export' | 'binary';
  intervalHours: number;
  scheduledTime: string;
  maxFiles: number;
  lastRunAt?: string;
  nextRunAt?: string;
  device?: { id: string; name: string; host: string };
}

export const backupApi = {
  list: (deviceId: string) => apiGet<BackupRecord[]>(`/api/v1/devices/${deviceId}/backups`),
  create: (deviceId: string, type: 'export' | 'binary') =>
    apiPost<BackupRecord>(`/api/v1/devices/${deviceId}/backup`, { type }),
  get: (backupId: string) => apiGet<BackupRecord>(`/api/v1/backups/${backupId}`),
  validate: (backupId: string) =>
    apiPost<BackupValidation>(`/api/v1/backups/${backupId}/validate`, {}),
  delete: (backupId: string) => apiDelete<BackupRecord>(`/api/v1/backups/${backupId}`),
  content: (backupId: string) =>
    apiGet<{ id: string; fileName: string; content: string }>(
      `/api/v1/backups/${backupId}/content`,
    ),
  download: async (backupId: string, fileName: string) => {
    const response = await fetch(buildApiUrl(`/api/v1/backups/${backupId}/download`), {
      headers: mergeHeaders(undefined),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: { message?: string };
        message?: string;
      } | null;
      throw new Error(
        payload?.error?.message ?? payload?.message ?? `Download failed (${response.status})`,
      );
    }
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  },
  downloadSelected: async (ids: string[]) => {
    const response = await fetch(buildApiUrl('/api/v1/backups/download-selected'), {
      method: 'POST',
      headers: mergeHeaders({ Accept: 'application/zip', 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: { message?: string } | string;
      } | null;
      const message = typeof payload?.error === 'string' ? payload.error : payload?.error?.message;
      throw new Error(message ?? `Download failed (${response.status})`);
    }
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const fileName = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? 'MME-backups.zip';
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  },
  deleteSelected: (ids: string[]) =>
    apiPost<{ requested: number; deleted: number }>('/api/v1/backups/delete-selected', { ids }),
  schedules: () => apiGet<BackupSchedule[]>('/api/v1/backup/schedules'),
  configureSchedule: (
    deviceId: string,
    input: {
      enabled: boolean;
      type: 'export' | 'binary';
      intervalHours: number;
      scheduledTime: string;
      maxFiles: number;
    },
  ) => apiPut<BackupSchedule>(`/api/v1/devices/${deviceId}/backup/schedule`, input),
  deleteSchedule: (scheduleId: string) =>
    apiDelete<BackupSchedule>(`/api/v1/backup/schedules/${scheduleId}`),
};
