import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, isAbsolute } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { BackupStorageService } from './backup-storage.service.js';

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe('backup storage service', () => {
  it('persists and reads a web-readable RSC from an absolute storage path', async () => {
    const root = mkdtempSync(join(tmpdir(), 'mme-backup-storage-'));
    directories.push(root);
    const storage = new BackupStorageService(root);
    const filePath = await storage.buildPath('router-01', 'MME_router-01_2026.rsc');
    const content = '# RouterOS export\n/interface bridge add name=bridge1\n';

    await storage.writeText(filePath, content);

    expect(isAbsolute(filePath)).toBe(true);
    expect(await storage.getFileInfo(filePath)).toMatchObject({
      exists: true,
      sizeBytes: Buffer.byteLength(content),
    });
    expect((await storage.read(filePath)).toString('utf8')).toBe(content);
  });
});
