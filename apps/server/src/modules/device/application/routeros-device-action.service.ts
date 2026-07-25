import { RouterClient } from '@mme/routeros-core';
import { spawn } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
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
  transport?: 'api' | 'rest' | 'script' | 'rest-crud';
  restTls?: boolean;
  restPort?: number;
  restMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  restBody?: Record<string, unknown>;
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
    if (!input.command.trim().startsWith('/')) {
      throw new HttpError(
        400,
        'INVALID_TERMINAL_COMMAND',
        'Command must start with a RouterOS / path',
      );
    }

    const destructive =
      isDestructiveCommand(input.command) ||
      (input.transport === 'rest-crud' && input.restMethod !== 'GET');
    if (destructive && !input.confirm) {
      throw new HttpError(
        400,
        'TERMINAL_CONFIRM_REQUIRED',
        'Destructive command requires confirmation',
      );
    }

    if (input.transport === 'script') {
      return this.withRest(deviceId, 'terminal-rest-script', input, '/execute', {
        script: input.command,
      });
    }

    if (input.transport === 'rest-crud') {
      return this.withRest(
        deviceId,
        'terminal-rest-crud',
        input,
        input.command,
        input.restBody ?? {},
        input.restMethod ?? 'GET',
      );
    }

    const parsed = parseRouterOsApiCommand(input.command);

    if (input.transport === 'rest') {
      return this.withRest(
        deviceId,
        'terminal-rest',
        input,
        parsed.path,
        restCommandBody(parsed.params),
      );
    }

    return this.withClient(deviceId, 'terminal', async (client) => ({
      message: `Executed through RouterOS API: ${input.command}`,
      data: await client.command(parsed.path, parsed.params, {
        queries: parsed.queries,
        timeoutMs: 60000,
      }),
    }));
  }

  private async withRest(
    deviceId: string,
    action: string,
    input: DeviceTerminalInput,
    path: string,
    body: Record<string, unknown>,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST',
  ): Promise<DeviceActionResult> {
    const device = await deviceRepository.findById(deviceId);
    if (!device) throw new HttpError(404, 'DEVICE_NOT_FOUND', 'Device not found');
    const startedAt = now();
    try {
      const tls = input.restTls ?? true;
      const port = input.restPort ?? (tls ? 443 : 80);
      const data = await routerOsRestRequest({
        host: device.host,
        port,
        tls,
        username: device.username,
        password: encryptionService.decrypt(device.passwordEncrypted),
        path: `/rest${path}`.replace(/\/+/g, '/'),
        body,
        method,
      });
      const finishedAt = now();
      return {
        action,
        success: true,
        startedAt,
        finishedAt,
        durationMs: duration(startedAt, finishedAt),
        message: `REST API đã thực thi: ${input.command}`,
        data,
      };
    } catch (error) {
      const finishedAt = now();
      return {
        action,
        success: false,
        startedAt,
        finishedAt,
        durationMs: duration(startedAt, finishedAt),
        message: error instanceof Error ? error.message : 'RouterOS REST API failed',
      };
    }
  }

  private async withClient(
    deviceId: string,
    action: string,
    run: (client: RouterClient) => Promise<{ message: string; data?: unknown }>,
  ): Promise<DeviceActionResult> {
    const device = await deviceRepository.findById(deviceId);

    if (!device) {
      throw new HttpError(404, 'DEVICE_NOT_FOUND', 'Device not found');
    }

    const startedAt = now();
    const client = new RouterClient({
      host: device.host,
      port: device.port,
      username: device.username,
      password: encryptionService.decrypt(device.passwordEncrypted),
      tls: device.useTls,
      loginMode: device.loginMode as 'auto' | 'modern' | 'legacy',
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
      await client.close();
    }
  }
}

function tokenizeCommand(command: string): string[] {
  const result: string[] = [];
  let token = '';
  let quote: '"' | "'" | null = null;
  let escaped = false;
  for (const char of command.trim()) {
    if (escaped) {
      token += char;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = null;
      else token += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (token) {
        result.push(token);
        token = '';
      }
    } else token += char;
  }
  if (token) result.push(token);
  return result;
}

const COMMAND_WORDS = new Set([
  'print',
  'get',
  'add',
  'set',
  'remove',
  'enable',
  'disable',
  'move',
  'find',
  'run',
  'monitor',
  'monitor-traffic',
  'export',
  'import',
  'execute',
  'reboot',
  'shutdown',
  'reset-configuration',
  'save',
  'load',
  'start',
  'stop',
  'scan',
  'ping',
  'torch',
]);

export function parseRouterOsApiCommand(command: string): {
  path: string;
  params: Record<string, string | boolean>;
  queries: string[];
} {
  const words = tokenizeCommand(command);
  let path = words.shift();
  if (!path?.startsWith('/')) throw new Error('RouterOS command must start with /');

  const pathParts: string[] = [];
  while (words.length > 0 && !words[0].includes('=')) {
    const word = words[0].replace(/^=/, '');
    if (word.startsWith('.') || word.startsWith('?')) break;
    if (COMMAND_WORDS.has(word.toLowerCase())) {
      pathParts.push(words.shift() as string);
      break;
    }
    if (pathParts.length > 0 || path.split('/').filter(Boolean).length < 2) {
      pathParts.push(words.shift() as string);
    } else break;
  }
  if (pathParts.length > 0) path = `${path}/${pathParts.join('/')}`;

  const params: Record<string, string | boolean> = {};
  const queries: string[] = [];
  let where = false;
  for (const word of words) {
    if (word.toLowerCase() === 'where') {
      where = true;
      continue;
    }
    if (word.toLowerCase() === 'and' || word === '&&') {
      continue;
    }
    if (word.startsWith('?')) {
      queries.push(word);
      continue;
    }
    if (where) {
      queries.push(toRouterOsQueryWord(word));
      continue;
    }
    const normalized = word.replace(/^=/, '');
    const separator = normalized.indexOf('=');
    if (separator < 0) params[normalized] = true;
    else params[normalized.slice(0, separator)] = normalized.slice(separator + 1);
  }
  return { path: normalizeApiPath(path), params, queries };
}

function toRouterOsQueryWord(expression: string): string {
  const match = /^([^=<>~!\s]+)(!=|>=|<=|=|>|<|~)(.*)$/.exec(expression);
  if (!match) {
    throw new Error(
      `Unsupported RouterOS where expression "${expression}". Use key=value, key~value, key>value, key<value, or REST Script mode for advanced CLI syntax.`,
    );
  }

  const [, key, operator, value] = match;
  switch (operator) {
    case '=':
      return `?${key}=${value}`;
    case '~':
      return `?${key}~${value}`;
    case '>':
    case '>=':
      return `?>${key}=${value}`;
    case '<':
    case '<=':
      return `?<${key}=${value}`;
    case '!=':
      throw new Error(
        'The RouterOS API terminal does not safely translate !=. Use REST Script mode for this expression.',
      );
    default:
      throw new Error(`Unsupported RouterOS query operator: ${operator}`);
  }
}

function normalizeApiPath(path: string): string {
  const finalWord = path.split('/').filter(Boolean).at(-1)?.toLowerCase() ?? '';
  return COMMAND_WORDS.has(finalWord) ? path : `${path}/print`;
}

function isDestructiveCommand(command: string): boolean {
  return /(\/remove\b|\bremove\b|reset-configuration|\/system\/reboot|\/system\/shutdown|format-drive|sup-output|\/system\/backup\/save|\/file\/remove)/i.test(
    command,
  );
}

function restCommandBody(
  params: Record<string, string | boolean>,
): Record<string, string | boolean | string[]> {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      key === '.query' && typeof value === 'string'
        ? value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        : value,
    ]),
  );
}

function routerOsRestRequest(input: {
  host: string;
  port: number;
  tls: boolean;
  username: string;
  password: string;
  path: string;
  body: Record<string, unknown>;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const sendsBody = input.method !== 'GET' && input.method !== 'DELETE';
    const payload = sendsBody ? JSON.stringify(input.body) : '';
    const request = (input.tls ? httpsRequest : httpRequest)(
      {
        hostname: input.host,
        port: input.port,
        path: input.path,
        method: input.method,
        rejectUnauthorized: false,
        headers: {
          Authorization: `Basic ${Buffer.from(`${input.username}:${input.password}`).toString('base64')}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 60000,
      },
      (response) => {
        let raw = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          if (raw.length < 2_000_000) raw += chunk;
        });
        response.on('end', () => {
          const status = response.statusCode ?? 500;
          let data: unknown = raw;
          try {
            data = raw ? JSON.parse(raw) : [];
          } catch {
            // RouterOS may return plain text for a small subset of commands.
          }
          if (status >= 400) {
            reject(new Error(`RouterOS REST API HTTP ${status}: ${raw || response.statusMessage}`));
          } else resolve(data);
        });
      },
    );
    request.on('timeout', () => request.destroy(new Error('RouterOS REST API timeout after 60s')));
    request.on('error', reject);
    if (payload) request.write(payload);
    request.end();
  });
}

export const routerOsDeviceActionService = new RouterOsDeviceActionService();
