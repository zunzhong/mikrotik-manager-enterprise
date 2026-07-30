import { RouterClient } from '@mme/routeros-core';
import { HttpError } from '../../errors/http-error.js';
import { encryptionService } from '../../security/encryption.service.js';
import { deviceRepository } from '../device/infrastructure/device.repository.js';

interface RouterRecord {
  '.id'?: string;
  id?: string;
  name?: string;
  action?: string;
  topics?: string;
  [key: string]: unknown;
}

interface RouterOsSyslogActionProfile {
  name: 'routeros-7.18+' | 'routeros-7-modern-split' | 'routeros-legacy' | 'compatible-minimal';
  parameters: Record<string, string>;
}

export interface ConfigureRouterOsSyslogInput {
  serverAddress: string;
  port: number;
  topics: string;
}

function recordId(record: RouterRecord | undefined): string | undefined {
  return record?.['.id'] ?? record?.id;
}

function routerOsVersion(value: unknown): { major: number; minor: number } | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d+)\.(\d+)/.exec(value.trim());
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]) };
}

function remoteEndpoint(serverAddress: string, port: number): string {
  const host =
    serverAddress.includes(':') && !serverAddress.startsWith('[')
      ? `[${serverAddress}]`
      : serverAddress;
  return `${host}:${port}`;
}

export function buildRouterOsSyslogActionProfiles(
  version: unknown,
  serverAddress: string,
  port: number,
): RouterOsSyslogActionProfile[] {
  const parsedVersion = routerOsVersion(version);
  const shared = {
    target: 'remote',
    'syslog-facility': 'local0',
    'syslog-severity': 'auto',
  };
  const modern: RouterOsSyslogActionProfile = {
    name: 'routeros-7.18+',
    parameters: {
      ...shared,
      'remote-log-format': 'syslog',
      'remote-protocol': 'udp',
      'remote-port': remoteEndpoint(serverAddress, port),
      'syslog-time-format': 'iso8601',
    },
  };
  const modernSplit: RouterOsSyslogActionProfile = {
    name: 'routeros-7-modern-split',
    parameters: {
      ...shared,
      remote: serverAddress,
      'remote-port': String(port),
      'remote-log-format': 'syslog',
      'syslog-time-format': 'iso8601',
    },
  };
  const legacy: RouterOsSyslogActionProfile = {
    name: 'routeros-legacy',
    parameters: {
      ...shared,
      remote: serverAddress,
      'remote-port': String(port),
      'bsd-syslog': 'yes',
    },
  };
  const compatibleMinimal: RouterOsSyslogActionProfile = {
    name: 'compatible-minimal',
    parameters: {
      ...shared,
      remote: serverAddress,
      'remote-port': String(port),
    },
  };

  if (parsedVersion?.major === 7 && parsedVersion.minor >= 18) {
    return [modern, modernSplit, compatibleMinimal];
  }
  if (parsedVersion && (parsedVersion.major < 7 || parsedVersion.major === 7)) {
    return [legacy, compatibleMinimal];
  }
  return [modern, modernSplit, legacy, compatibleMinimal];
}

function isParameterCompatibilityError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /unknown parameter|invalid value.*(?:remote|syslog)|expected.*(?:remote|syslog)/i.test(
    message,
  );
}

export class SyslogRouterOsService {
  public async configure(deviceId: string, input: ConfigureRouterOsSyslogInput) {
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
      rejectUnauthorized: false,
    });
    try {
      await client.connect();
      const resource = await client.command('/system/resource/print', {
        '.proplist': 'version',
      });
      const version = resource.rows[0]?.version;
      const actions = (
        await client.command(
          '/system/logging/action/print',
          {},
          { queries: ['?name=mme-syslog'], timeoutMs: 15000 },
        )
      ).rows as RouterRecord[];
      const actionId = recordId(actions[0]);
      const profiles = buildRouterOsSyslogActionProfiles(version, input.serverAddress, input.port);
      let appliedProfile: RouterOsSyslogActionProfile | undefined;
      let lastCompatibilityError: unknown;
      for (const profile of profiles) {
        try {
          if (actionId) {
            await client.command('/system/logging/action/set', {
              '.id': actionId,
              ...profile.parameters,
            });
          } else {
            await client.command('/system/logging/action/add', {
              name: 'mme-syslog',
              ...profile.parameters,
            });
          }
          appliedProfile = profile;
          break;
        } catch (error) {
          if (!isParameterCompatibilityError(error)) throw error;
          lastCompatibilityError = error;
        }
      }
      if (!appliedProfile) throw lastCompatibilityError;

      const rules = (
        await client.command(
          '/system/logging/print',
          {},
          { queries: ['?action=mme-syslog'], timeoutMs: 15000 },
        )
      ).rows as RouterRecord[];
      const ruleId = recordId(rules[0]);
      if (ruleId) {
        await client.command('/system/logging/set', {
          '.id': ruleId,
          topics: input.topics,
          action: 'mme-syslog',
        });
      } else {
        await client.command('/system/logging/add', {
          topics: input.topics,
          action: 'mme-syslog',
        });
      }
      let duplicateRulesRemoved = 0;
      for (const duplicate of rules.slice(1)) {
        const duplicateId = recordId(duplicate);
        if (!duplicateId) continue;
        await client.command('/system/logging/remove', { '.id': duplicateId });
        duplicateRulesRemoved += 1;
      }

      return {
        deviceId,
        deviceName: device.name,
        success: true,
        action: 'mme-syslog',
        serverAddress: input.serverAddress,
        port: input.port,
        protocol: 'udp',
        topics: input.topics,
        routerOsVersion: typeof version === 'string' ? version : 'unknown',
        configurationProfile: appliedProfile.name,
        duplicateRulesRemoved,
      };
    } catch (error) {
      return {
        deviceId,
        deviceName: device.name,
        success: false,
        action: 'mme-syslog',
        serverAddress: input.serverAddress,
        port: input.port,
        protocol: 'udp',
        topics: input.topics,
        error: error instanceof Error ? error.message : 'Unable to configure RouterOS Syslog.',
      };
    } finally {
      await client.close();
    }
  }
}

export const syslogRouterOsService = new SyslogRouterOsService();
