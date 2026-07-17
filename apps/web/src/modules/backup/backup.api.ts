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
  lastRunAt?: string;
  nextRunAt?: string;
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
    if (!response.ok) throw new Error(`Download failed (${response.status})`);
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  },
  schedules: () => apiGet<BackupSchedule[]>('/api/v1/backup/schedules'),
  configureSchedule: (
    deviceId: string,
    input: { enabled: boolean; type: 'export' | 'binary'; intervalHours: number },
  ) => apiPut<BackupSchedule>(`/api/v1/devices/${deviceId}/backup/schedule`, input),
};
