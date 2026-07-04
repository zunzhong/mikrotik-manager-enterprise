import { RouterClient } from '@mme/routeros-core';
import { eventBus } from '../../../core/index.js';
import { encryptionService } from '../../../security/encryption.service.js';
import { deviceRepository } from '../../device/infrastructure/device.repository.js';
import { backupRepository } from '../infrastructure/backup.repository.js';
import type { BackupType } from '../domain/backup.types.js';

function timestampName(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export class BackupService {
  public list(deviceId: string) {
    return backupRepository.listByDevice(deviceId);
  }

  public async create(deviceId: string, type: BackupType = 'export') {
    const device = await deviceRepository.findById(deviceId);

    if (!device) {
      throw new Error('Device not found');
    }

    const extension = type === 'binary' ? 'backup' : 'rsc';
    const fileName = `${device.name.replace(/\s+/g, '-')}-${timestampName()}.${extension}`;

    const record = await backupRepository.create({
      deviceId,
      type,
      status: 'running',
      fileName,
      metadata: {
        host: device.host,
        type,
      },
    });

    const client = new RouterClient({
      host: device.host,
      port: device.port,
      username: device.username,
      password: encryptionService.decrypt(device.passwordEncrypted),
      tls: device.useTls,
      loginMode: device.loginMode as 'auto' | 'modern' | 'legacy',
      timeoutMs: 15000,
    });

    try {
      await client.connect();

      if (type === 'binary') {
        await client.command('/system/backup/save', {
          name: fileName.replace('.backup', ''),
        });
      } else {
        await client.command('/export', {
          file: fileName.replace('.rsc', ''),
        });
      }

      await client.close();

      const completed = await backupRepository.update(record.id, {
        status: 'completed',
        completedAt: new Date(),
        metadata: {
          host: device.host,
          type,
          routerFileName: fileName,
          note: 'RouterOS backup/export command completed. File download/storage will be added in next part.',
        },
      });

      await eventBus.emit('backup.completed', {
        deviceId,
        backupId: completed.id,
        type,
        fileName,
      });

      return completed;
    } catch (error) {
      await client.close().catch(() => undefined);

      const failed = await backupRepository.update(record.id, {
        status: 'failed',
        completedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown backup error',
      });

      await eventBus.emit('backup.failed', {
        deviceId,
        backupId: failed.id,
        type,
        error: failed.error,
      });

      return failed;
    }
  }

  public delete(id: string) {
    return backupRepository.delete(id);
  }
}

export const backupService = new BackupService();
