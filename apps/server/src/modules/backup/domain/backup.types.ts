export type BackupType = 'binary' | 'export';
export type BackupStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface CreateBackupInput {
  type: BackupType;
}
