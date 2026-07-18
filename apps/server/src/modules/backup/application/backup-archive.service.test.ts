import { describe, expect, it } from 'vitest';
import { backupArchiveService } from './backup-archive.service.js';

describe('backup archive service', () => {
  it('creates a ZIP archive containing all selected backup files', () => {
    const archive = backupArchiveService.create([
      { fileName: 'MME_router-1.rsc', content: Buffer.from('/export\n') },
      { fileName: 'MME_router-2.backup', content: Buffer.from([1, 2, 3, 4]) },
    ]);

    expect(archive.readUInt32LE(0)).toBe(0x04034b50);
    expect(archive.includes(Buffer.from('MME_router-1.rsc'))).toBe(true);
    expect(archive.includes(Buffer.from('/export\n'))).toBe(true);
    expect(archive.includes(Buffer.from('MME_router-2.backup'))).toBe(true);
    expect(archive.readUInt32LE(archive.length - 22)).toBe(0x06054b50);
    expect(archive.readUInt16LE(archive.length - 12)).toBe(2);
  });
});
