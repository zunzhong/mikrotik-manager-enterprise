import { apiDelete, apiGet, apiPost } from '../../lib/api';

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
}

export interface BackupValidation {
  valid: boolean;
  type: string;
  status: string;
  warnings: string[];
}

export const backupApi = {
  list: (deviceId: string) => apiGet<BackupRecord[]>(`/api/v1/devices/${deviceId}/backups`),
  create: (deviceId: string, type: 'export' | 'binary') =>
    apiPost<BackupRecord>(`/api/v1/devices/${deviceId}/backup`, { type }),
  get: (backupId: string) => apiGet<BackupRecord>(`/api/v1/backups/${backupId}`),
  validate: (backupId: string) =>
    apiPost<BackupValidation>(`/api/v1/backups/${backupId}/validate`, {}),
  delete: (backupId: string) => apiDelete<BackupRecord>(`/api/v1/backups/${backupId}`),
};
