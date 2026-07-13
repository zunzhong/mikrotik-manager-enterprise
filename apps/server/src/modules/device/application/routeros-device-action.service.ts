import { RouterOsClient } from '@mme/routeros-sdk';
import { spawn } from 'node:child_process';
import { platform } from 'node:os';
import { HttpError } from '../../../errors/http-error.js';
import { encryptionService } from '../../../security/encryption.service.js';
import { deviceRepository } from '../infrastructure/device.repository.js';

export interface DeviceActionResult {
  action: string;
  success: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  message: string;
  data?: unknown;
}

export interface DevicePingInput {
  address?: string;
  count?: number;
}

export interface DeviceBackupInput {
  name?: string;
  confirm?: boolean;
}

export interface DeviceSupoutInput {
  name?: string;
  confirm?: boolean;
}

export interface DeviceRebootInput {
  confirm: boolean;
}

export interface DeviceTerminalInput {
  command: string;
  confirm?: boolean;
}

function now(): string {
  return new Date().toISOString();
}

function duration(startedAt: string, finishedAt: string): number {
  return new Date(finishedAt).getTime() - new Date(startedAt).getTime();
}

function safeFileName(prefix: string): string {
  return `${prefix}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
}

export class RouterOsDeviceActionService {
  public async pingToDevice(deviceId: string, count = 4): Promise<DeviceActionResult> {
    const device = await deviceRepository.findById(deviceId);
    if (!device) throw new HttpError(404, 'DEVICE_NOT_FOUND', 'Device not found');

    const startedAt = now();
    const windows = platform() === 'win32';
    const args = windows
      ? ['-n', String(count), '-w', '3000', device.host]
      : ['-c', String(count), '-W', '3', device.host];

    return new Promise((resolve) => {
      const process = spawn('ping', args, { windowsHide: true, shell: false });
      let output = '';
      const append = (chunk: Buffer) => {
        if (output.length < 24000) output += chunk.toString();
      };
      process.stdout.on('data', append);
      process.stderr.on('data', append);
      process.on('error', (error) => {
        const finishedAt = now();
        resolve({
          action: 'ping-to-device',
          success: false,
          startedAt,
          finishedAt,
          durationMs: duration(startedAt, finishedAt),
          message: error.message,
        });
      });
      process.on('close', (code) => {
        const finishedAt = now();
        resolve({
          action: 'ping-to-device',
          success: code === 0,
          startedAt,
          finishedAt,
          durationMs: duration(startedAt, finishedAt),
          message:
            code === 0
              ? `Ping tới ${device.host} thành công.`
              : `Không nhận được phản hồi ping từ ${device.host}.`,
          data: { address: device.host, count, exitCode: code, output: output.trim() },
        });
      });
    });
  }

  public async pingFromDevice(
    deviceId: string,
    input: DevicePingInput = {},
  ): Promise<DeviceActionResult> {
    return this.withClient(deviceId, 'ping-from-device', async (client) => {
      const address = input.address ?? '8.8.8.8';
      const count = input.count ?? 4;
      const replies = await client.command('/ping', { address, count }, { timeoutMs: 20000 });

      return {
        message: `Ping command completed for ${address}`,
        data: replies,
      };
    });
  }

  public async backup(
    deviceId: string,
    input: DeviceBackupInput = {},
  ): Promise<DeviceActionResult> {
    if (!input.confirm) {
      throw new HttpError(400, 'BACKUP_CONFIRM_REQUIRED', 'Backup creation requires confirmation');
    }
    return this.withClient(deviceId, 'backup', async (client) => {
      const name = input.name ?? safeFileName('mme-backup');
      const replies = await client.command('/system/backup/save', { name }, { timeoutMs: 30000 });

      return {
        message: `Backup created on router: ${name}.backup`,
        data: { fileName: `${name}.backup`, replies },
      };
    });
  }

  public async supout(
    deviceId: string,
    input: DeviceSupoutInput = {},
  ): Promise<DeviceActionResult> {
    if (!input.confirm) {
      throw new HttpError(400, 'SUPOUT_CONFIRM_REQUIRED', 'Supout creation requires confirmation');
    }
    return this.withClient(deviceId, 'supout', async (client) => {
      const file = input.name ?? safeFileName('mme-supout');
      const replies = await client.command('/system/sup-output', { file }, { timeoutMs: 60000 });

      return {
        message: `Supout file requested on router: ${file}.rif`,
        data: { fileName: `${file}.rif`, replies },
      };
    });
  }

  public async reboot(deviceId: string, input: DeviceRebootInput): Promise<DeviceActionResult> {
    if (!input.confirm) {
      throw new HttpError(400, 'REBOOT_CONFIRM_REQUIRED', 'Reboot requires confirm=true');
    }

    return this.withClient(deviceId, 'reboot', async (client) => {
      const replies = await client
        .command('/system/reboot', {}, { timeoutMs: 10000 })
        .catch((error) => {
          // Router may close the API connection immediately after accepting reboot.
          if (error instanceof Error) {
            return [{ type: 'connection-closed-after-reboot', message: error.message }];
          }

          return [{ type: 'connection-closed-after-reboot' }];
        });

      return {
        message: 'Reboot command sent to router',
        data: replies,
      };
    });
  }

  public async terminal(deviceId: string, input: DeviceTerminalInput): Promise<DeviceActionResult> {
    const words = tokenizeCommand(input.command);
    const path = words.shift();
    if (!path?.startsWith('/')) {
      throw new HttpError(
        400,
        'INVALID_TERMINAL_COMMAND',
        'Command must start with a RouterOS / path',
      );
    }

    const destructive =
      /\/(remove|reset-configuration|reboot|shutdown|format-drive|sup-output)$/i.test(path) ||
      path.startsWith('/system/backup/');
    if (destructive && !input.confirm) {
      throw new HttpError(
        400,
        'TERMINAL_CONFIRM_REQUIRED',
        'Destructive command requires confirmation',
      );
    }

    const params: Record<string, string | boolean> = {};
    for (const word of words) {
      const normalized = word.replace(/^=/, '');
      const separator = normalized.indexOf('=');
      if (separator < 0) params[normalized] = true;
      else params[normalized.slice(0, separator)] = normalized.slice(separator + 1);
    }

    return this.withClient(deviceId, 'terminal', async (client) => ({
      message: `Đã thực thi: ${input.command}`,
      data: await client.command(path, params, { timeoutMs: 60000 }),
    }));
  }

  private async withClient(
    deviceId: string,
    action: string,
    run: (client: RouterOsClient) => Promise<{ message: string; data?: unknown }>,
  ): Promise<DeviceActionResult> {
    const device = await deviceRepository.findById(deviceId);

    if (!device) {
      throw new HttpError(404, 'DEVICE_NOT_FOUND', 'Device not found');
    }

    const startedAt = now();
    const client = new RouterOsClient({
      host: device.host,
      port: device.port,
      username: device.username,
      password: encryptionService.decrypt(device.passwordEncrypted),
      tls: device.useTls,
      timeoutMs: 15000,
      rejectUnauthorized: false,
    });

    try {
      await client.connect();
      const result = await run(client);
      const finishedAt = now();

      return {
        action,
        success: true,
        startedAt,
        finishedAt,
        durationMs: duration(startedAt, finishedAt),
        message: result.message,
        data: result.data,
      };
    } catch (error) {
      const finishedAt = now();

      return {
        action,
        success: false,
        startedAt,
        finishedAt,
        durationMs: duration(startedAt, finishedAt),
        message: error instanceof Error ? error.message : `RouterOS ${action} action failed`,
      };
    } finally {
      client.close();
    }
  }
}

function tokenizeCommand(command: string): string[] {
  return [...command.trim().matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map(
    (match) => match[1] ?? match[2] ?? match[3],
  );
}

export const routerOsDeviceActionService = new RouterOsDeviceActionService();
