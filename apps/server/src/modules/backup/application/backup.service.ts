import { RouterClient } from '@mme/routeros-core';
import { HttpError } from '../../../errors/http-error.js';
import { eventBus } from '../../../core/index.js';
import { encryptionService } from '../../../security/encryption.service.js';
import { deviceRepository } from '../../device/infrastructure/device.repository.js';
import { backupRepository } from '../infrastructure/backup.repository.js';
import { backupStorageService } from './backup-storage.service.js';
import { restoreValidationService } from './restore-validation.service.js';
import type { BackupType } from '../domain/backup.types.js';

function timestampName(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export class BackupService {
  public list(deviceId: string) {
    return backupRepository.listByDevice(deviceId);
  }

  public async get(id: string) {
    const backup = await backupRepository.findById(id);

    if (!backup) {
      throw new HttpError(404, 'BACKUP_NOT_FOUND', 'Backup not found');
    }

    const fileInfo = await backupStorageService.getFileInfo(backup.filePath);

    return {
      ...backup,
      storage: fileInfo,
      validation: restoreValidationService.validateMetadata({
        type: backup.type,
        fileName: backup.fileName,
        status: backup.status,
      }),
    };
  }

  public async create(deviceId: string, type: BackupType = 'export') {
    const device = await deviceRepository.findById(deviceId);

    if (!device) {
      throw new Error('Device not found');
    }

    const extension = type === 'binary' ? 'backup' : 'rsc';
    const fileName = backupStorageService.sanitizeFileName(
      `${device.name.replace(/\s+/g, '-')}-${timestampName()}.${extension}`,
    );
    const filePath = await backupStorageService.buildPath(deviceId, fileName);

    const record = await backupRepository.create({
      deviceId,
      type,
      status: 'running',
      fileName,
      filePath,
      metadata: {
        host: device.host,
        type,
        storage: 'local',
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
        filePath,
        checksum: backupStorageService.checksumText(`${deviceId}:${fileName}`),
        metadata: {
          host: device.host,
          type,
          routerFileName: fileName,
          localPath: filePath,
          note: 'RouterOS command completed. Physical file transfer will be added later.',
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

  public async validate(id: string) {
    const backup = await this.get(id);

    return restoreValidationService.validateMetadata({
      type: backup.type,
      fileName: backup.fileName,
      status: backup.status,
    });
  }

  public delete(id: string) {
    return backupRepository.delete(id);
  }
}

export const backupService = new BackupService();
