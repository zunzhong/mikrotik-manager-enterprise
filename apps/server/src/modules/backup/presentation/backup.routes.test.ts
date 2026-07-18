import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { backupService } from '../application/backup.service.js';
import { backupRoutes } from './backup.routes.js';

describe('backup file and schedule routes', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns stored RSC content for the web preview popup', async () => {
    const content = '# RouterOS export\n/interface bridge add name=bridge1\n';
    vi.spyOn(backupService, 'readFile').mockResolvedValue({
      backup: {
        id: 'backup-1',
        fileName: 'MME_router-01_2026.rsc',
      } as Awaited<ReturnType<typeof backupService.get>>,
      content: Buffer.from(content),
    });
    const app = Fastify();
    await app.register(backupRoutes);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/backups/backup-1/content',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual({
      id: 'backup-1',
      fileName: 'MME_router-01_2026.rsc',
      content,
    });
    expect(backupService.readFile).toHaveBeenCalledWith('backup-1', true);
    await app.close();
  });

  it('downloads the stored backup with its original file name', async () => {
    const content = Buffer.from('# RouterOS export\n');
    vi.spyOn(backupService, 'readFile').mockResolvedValue({
      backup: {
        id: 'backup-2',
        fileName: 'MME_router-02_2026.rsc',
      } as Awaited<ReturnType<typeof backupService.get>>,
      content,
    });
    const app = Fastify();
    await app.register(backupRoutes);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/backups/backup-2/download',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-disposition']).toContain('MME_router-02_2026.rsc');
    expect(response.rawPayload).toEqual(content);
    await app.close();
  });

  it('deletes an existing automatic backup schedule', async () => {
    const remove = vi.spyOn(backupService, 'deleteSchedule').mockResolvedValue({
      id: 'schedule-1',
      deviceId: 'device-1',
      enabled: true,
      type: 'export',
      intervalHours: 24,
      scheduledTime: '02:00',
      maxFiles: 30,
      lastRunAt: null,
      nextRunAt: null,
      createdAt: new Date('2026-07-17T00:00:00Z'),
      updatedAt: new Date('2026-07-17T00:00:00Z'),
    });
    const app = Fastify();
    await app.register(backupRoutes);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/backup/schedules/schedule-1',
    });

    expect(response.statusCode).toBe(200);
    expect(remove).toHaveBeenCalledWith('schedule-1');
    await app.close();
  });

  it('downloads selected backups as one ZIP archive', async () => {
    const content = Buffer.from('PK selected backups');
    const archive = vi.spyOn(backupService, 'createArchive').mockResolvedValue({
      fileName: 'MME-backups-test.zip',
      content,
      count: 2,
    });
    const app = Fastify();
    await app.register(backupRoutes);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/backups/download-selected',
      payload: { ids: ['backup-1', 'backup-2'] },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/zip');
    expect(response.headers['content-disposition']).toContain('MME-backups-test.zip');
    expect(response.headers['x-mme-backup-count']).toBe('2');
    expect(response.rawPayload).toEqual(content);
    expect(archive).toHaveBeenCalledWith(['backup-1', 'backup-2']);
    await app.close();
  });

  it('deletes selected backup records and physical files through the service', async () => {
    const remove = vi.spyOn(backupService, 'deleteMany').mockResolvedValue({
      requested: 2,
      deleted: 2,
    });
    const app = Fastify();
    await app.register(backupRoutes);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/backups/delete-selected',
      payload: { ids: ['backup-1', 'backup-2'] },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual({ requested: 2, deleted: 2 });
    expect(remove).toHaveBeenCalledWith(['backup-1', 'backup-2']);
    await app.close();
  });
});
