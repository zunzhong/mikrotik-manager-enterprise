import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

export class BackupStorageService {
  private readonly rootDir: string;

  public constructor(
    rootDir = process.env.BACKUP_STORAGE_DIR ?? process.env.BACKUP_STORAGE_PATH ?? './data/backups',
  ) {
    this.rootDir = resolve(rootDir);
  }

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
      const resolvedPath = await this.resolveExistingPath(filePath);
      const info = await stat(resolvedPath);
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

  public writeText(filePath: string, content: string): Promise<void> {
    return writeFile(filePath, content, 'utf8');
  }

  public write(filePath: string, content: Buffer): Promise<void> {
    return writeFile(filePath, content);
  }

  public async read(filePath: string): Promise<Buffer> {
    return readFile(await this.resolveExistingPath(filePath));
  }

  public async delete(filePath?: string | null): Promise<boolean> {
    if (!filePath) return false;
    try {
      await unlink(await this.resolveExistingPath(filePath));
      return true;
    } catch (error) {
      if (error instanceof Error && /not found|ENOENT/i.test(error.message)) return false;
      throw error;
    }
  }

  public checksumText(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  public checksum(content: Buffer): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private async resolveExistingPath(filePath: string): Promise<string> {
    const directPath = resolve(filePath);
    if (await this.exists(directPath)) return directPath;

    const normalized = filePath.replace(/\\/g, '/');
    const marker = '/backups/';
    const markerIndex = `/${normalized}`.toLowerCase().indexOf(marker);
    if (markerIndex >= 0) {
      const suffix = `/${normalized}`.slice(markerIndex + marker.length);
      const migratedPath = resolve(this.rootDir, suffix);
      if (this.isInsideRoot(migratedPath) && (await this.exists(migratedPath))) return migratedPath;
    }

    throw new Error(`Backup file not found: ${filePath}`);
  }

  private async exists(filePath: string): Promise<boolean> {
    try {
      await stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private isInsideRoot(filePath: string): boolean {
    const child = relative(this.rootDir, filePath);
    return child === '' || (!child.startsWith(`..${sep}`) && child !== '..' && !isAbsolute(child));
  }
}

export const backupStorageService = new BackupStorageService();
