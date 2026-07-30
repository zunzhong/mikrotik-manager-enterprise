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

export interface ConfigureRouterOsSyslogInput {
  serverAddress: string;
  port: number;
  topics: string;
}

function recordId(record: RouterRecord | undefined): string | undefined {
  return record?.['.id'] ?? record?.id;
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
      const actions = (
        await client.command(
          '/system/logging/action/print',
          {},
          { queries: ['?name=mme-syslog'], timeoutMs: 15000 },
        )
      ).rows as RouterRecord[];
      const actionParameters = {
        target: 'remote',
        remote: input.serverAddress,
        'remote-port': String(input.port),
        'bsd-syslog': 'yes',
        'syslog-facility': 'local0',
        'syslog-severity': 'auto',
      };
      const actionId = recordId(actions[0]);
      if (actionId) {
        await client.command('/system/logging/action/set', {
          '.id': actionId,
          ...actionParameters,
        });
      } else {
        await client.command('/system/logging/action/add', {
          name: 'mme-syslog',
          ...actionParameters,
        });
      }

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
