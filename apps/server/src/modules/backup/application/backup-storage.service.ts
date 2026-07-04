import { createHash } from 'node:crypto';
import { mkdir, stat } from 'node:fs/promises';
import { join, normalize } from 'node:path';

export class BackupStorageService {
  private readonly rootDir = normalize(process.env.BACKUP_STORAGE_DIR ?? './data/backups');

  public async ensureRoot(): Promise<void> {
    await mkdir(this.rootDir, { recursive: true });
  }

  public sanitizeFileName(fileName: string): string {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
  }

  public async buildPath(deviceId: string, fileName: string): Promise<string> {
    await this.ensureRoot();
    const safeDeviceId = this.sanitizeFileName(deviceId);
    const safeFileName = this.sanitizeFileName(fileName);
    const deviceDir = join(this.rootDir, safeDeviceId);
    await mkdir(deviceDir, { recursive: true });
    return join(deviceDir, safeFileName);
  }

  public async getFileInfo(filePath?: string | null) {
    if (!filePath) {
      return {
        exists: false,
      };
    }

    try {
      const info = await stat(filePath);
      return {
        exists: true,
        sizeBytes: info.size,
        modifiedAt: info.mtime,
      };
    } catch {
      return {
        exists: false,
      };
    }
  }

  public checksumText(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}

export const backupStorageService = new BackupStorageService();
