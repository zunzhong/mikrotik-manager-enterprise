import { RouterClient } from '@mme/routeros-core';
import { prisma } from '../../../database/index.js';
import { HttpError } from '../../../errors/http-error.js';
import { eventBus } from '../../../core/index.js';
import { encryptionService } from '../../../security/encryption.service.js';
import { deviceRepository } from '../../device/infrastructure/device.repository.js';
import { backupRepository } from '../infrastructure/backup.repository.js';
import { backupStorageService } from './backup-storage.service.js';
import { restoreValidationService } from './restore-validation.service.js';
import type { BackupType } from '../domain/backup.types.js';
import { nextScheduledRun } from './backup-schedule.js';
import {
  buildRouterFileTransferCandidates,
  RouterServiceRestoreError,
  routerFileTransferService,
  withTemporaryRouterService,
} from './router-file-transfer.service.js';

function timestampName(): string {
  return new Date().toISOString().replace('T', '_').replace(/[:.]/g, '-').replace('Z', '');
}

function rowText(rows: Array<Record<string, string>>, key: string): string {
  return rows
    .map((row) => row[key] ?? '')
    .filter(Boolean)
    .join('\n');
}

export class BackupService {
  public async list(deviceId: string) {
    const records = await backupRepository.listByDevice(deviceId);
    return Promise.all(
      records.map(async (backup) => ({
        ...backup,
        storage: await backupStorageService.getFileInfo(backup.filePath),
      })),
    );
  }

  public async get(id: string) {
    const backup = await backupRepository.findById(id);
    if (!backup) throw new HttpError(404, 'BACKUP_NOT_FOUND', 'Backup not found');
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
    if (!device) throw new HttpError(404, 'DEVICE_NOT_FOUND', 'Device not found');

    const client = new RouterClient({
      host: device.host,
      port: device.port,
      username: device.username,
      password: encryptionService.decrypt(device.passwordEncrypted),
      tls: device.useTls,
      loginMode: device.loginMode as 'auto' | 'modern' | 'legacy',
      timeoutMs: 15000,
    });

    let record: Awaited<ReturnType<typeof backupRepository.create>> | null = null;
    try {
      await client.connect();
      const identityResponse = await client.command('/system/identity/print');
      const identity = identityResponse.rows[0]?.name?.trim() || device.name;
      const extension = type === 'binary' ? 'backup' : 'rsc';
      const fileName = backupStorageService.sanitizeFileName(
        `MME_${identity.replace(/\s+/g, '-')}_${timestampName()}.${extension}`,
      );
      const filePath = await backupStorageService.buildPath(deviceId, fileName);

      record = await backupRepository.create({
        deviceId,
        type,
        status: 'running',
        fileName,
        filePath,
        metadata: { host: device.host, identity, type, storage: 'local' },
      });

      if (type === 'binary') {
        await client.command('/system/backup/save', { name: fileName.replace('.backup', '') });
      } else {
        await client.command('/export', { file: fileName.replace('.rsc', '') });
      }

      const routerFile =
        type === 'binary'
          ? await this.downloadBinaryRouterFile(client, {
              host: device.host,
              username: device.username,
              password: encryptionService.decrypt(device.passwordEncrypted),
              fileName,
            })
          : await this.readTextRouterFile(client, fileName);
      await backupStorageService.write(filePath, routerFile.content);
      if (routerFile.id) {
        await client.command('/file/remove', { numbers: routerFile.id }).catch(() => undefined);
      }

      await client.close();
      const storedFile = await backupStorageService.getFileInfo(filePath);
      if (!storedFile.exists || !storedFile.sizeBytes) {
        throw new Error('MME did not persist the RouterOS backup file');
      }
      const completed = await backupRepository.update(record.id, {
        status: 'completed',
        completedAt: new Date(),
        filePath,
        sizeBytes: storedFile.sizeBytes,
        checksum: backupStorageService.checksum(routerFile.content),
        metadata: {
          host: device.host,
          identity,
          type,
          routerFileName: fileName,
          localPath: filePath,
          locallyAvailable: true,
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
      if (!record) throw error;
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

  public async readFile(id: string, textOnly = false) {
    const backup = await this.get(id);
    if (!backup.filePath || !backup.storage.exists) {
      throw new HttpError(409, 'BACKUP_FILE_UNAVAILABLE', 'Backup file is not available locally');
    }
    if (textOnly && !backup.fileName.toLowerCase().endsWith('.rsc')) {
      throw new HttpError(415, 'BACKUP_NOT_TEXT', 'Only .rsc files can be opened as text');
    }
    return { backup, content: await backupStorageService.read(backup.filePath) };
  }

  public listSchedules() {
    return prisma.backupSchedule.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { device: { select: { id: true, name: true, host: true } } },
    });
  }

  public async configureSchedule(
    deviceId: string,
    input: {
      enabled: boolean;
      type: BackupType;
      intervalHours: number;
      scheduledTime: string;
    },
  ) {
    const device = await deviceRepository.findById(deviceId);
    if (!device) throw new HttpError(404, 'DEVICE_NOT_FOUND', 'Device not found');
    const nextRunAt = input.enabled
      ? nextScheduledRun(input.scheduledTime, input.intervalHours)
      : null;
    return prisma.backupSchedule.upsert({
      where: { deviceId },
      create: { deviceId, ...input, nextRunAt },
      update: { ...input, nextRunAt },
    });
  }

  public async deleteSchedule(id: string) {
    const schedule = await prisma.backupSchedule.findUnique({ where: { id } });
    if (!schedule) throw new HttpError(404, 'BACKUP_SCHEDULE_NOT_FOUND', 'Schedule not found');
    return prisma.backupSchedule.delete({ where: { id } });
  }

  public async runDueSchedules() {
    const due = await prisma.backupSchedule.findMany({
      where: { enabled: true, OR: [{ nextRunAt: null }, { nextRunAt: { lte: new Date() } }] },
    });
    for (const schedule of due) {
      const startedAt = new Date();
      await prisma.backupSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: startedAt,
          nextRunAt: nextScheduledRun(schedule.scheduledTime, schedule.intervalHours, startedAt),
        },
      });
      await this.create(schedule.deviceId, schedule.type as BackupType).catch(() => undefined);
    }
    return due.length;
  }

  public delete(id: string) {
    return backupRepository.delete(id);
  }

  private async waitForRouterFile(
    client: RouterClient,
    fileName: string,
    includeContents: boolean,
  ) {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const response = await client.command(
        '/file/print',
        { '.proplist': includeContents ? '.id,name,size,contents' : '.id,name,size' },
        { queries: [`?name=${fileName}`] },
      );
      const file = response.rows[0];
      if (file && file.size && file.size !== '0') return { file, response };
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(`RouterOS did not finish creating ${fileName}`);
  }

  private async readTextRouterFile(client: RouterClient, fileName: string) {
    const { file, response } = await this.waitForRouterFile(client, fileName, true);
    for (let attempt = 0; attempt < 10; attempt += 1) {
      let contents = file.contents ?? rowText(response.rows, 'contents');
      if (!contents) {
        const result = await client.command('/file/get', {
          number: file['.id'] ?? fileName,
          'value-name': 'contents',
        });
        contents = result.done.ret ?? rowText(result.rows, 'ret');
      }
      if (contents) {
        return { id: file['.id'], content: Buffer.from(contents, 'utf8') };
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(`RouterOS did not return file contents for ${fileName}`);
  }

  private async downloadBinaryRouterFile(
    client: RouterClient,
    input: { host: string; username: string; password: string; fileName: string },
  ) {
    const { file } = await this.waitForRouterFile(client, input.fileName, false);
    const serviceResponse = await client.command('/ip/service/print', {
      '.proplist': '.id,name,port,disabled',
    });
    const candidates = buildRouterFileTransferCandidates(serviceResponse.rows);
    if (!candidates.length) {
      throw new Error('RouterOS did not expose SSH or FTP service information to MME');
    }

    const failures: string[] = [];
    for (const candidate of candidates) {
      try {
        const transfer = await withTemporaryRouterService(
          candidate,
          async (disabled) => {
            await client.command('/ip/service/set', {
              numbers: candidate.serviceId,
              disabled: disabled ? 'yes' : 'no',
            });
            if (!disabled) await new Promise((resolve) => setTimeout(resolve, 500));
          },
          () =>
            routerFileTransferService.download({
              ...input,
              candidates: [candidate],
            }),
        );
        return { id: file['.id'], content: transfer.content };
      } catch (error) {
        if (error instanceof RouterServiceRestoreError) throw error;
        failures.push(
          `${candidate.serviceName}:${candidate.port} - ${
            error instanceof Error ? error.message : 'transfer failed'
          }`,
        );
      }
    }

    throw new Error(
      `MME could not transfer ${input.fileName}; RouterOS service state was restored. ${failures.join(
        '; ',
      )}`,
    );
  }
}

export const backupService = new BackupService();
