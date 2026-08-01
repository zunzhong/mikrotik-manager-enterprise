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
  name: 'routeros-7.18+' | 'routeros-7.18+-endpoint' | 'routeros-legacy' | 'compatible-minimal';
  parameters: Record<string, string>;
}

type SyslogDeliveryVerifier = (marker: string) => Promise<boolean>;

export const ROUTEROS_SYSLOG_ACTION_NAME = 'MMESyslog';
const LEGACY_ROUTEROS_SYSLOG_ACTION_NAME = 'mme-syslog';

function isManagedActionName(value: unknown): boolean {
  return value === ROUTEROS_SYSLOG_ACTION_NAME || value === LEGACY_ROUTEROS_SYSLOG_ACTION_NAME;
}

export interface ConfigureRouterOsSyslogInput {
  serverAddress: string;
  port: number;
  topics: string;
}

function recordId(record: RouterRecord | undefined): string | undefined {
  return record?.['.id'] ?? record?.id;
}

function normalizedTopics(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map((topic) => topic.trim().toLowerCase())
    .filter(Boolean)
    .sort();
}

function actionMatchesProfile(action: RouterRecord, profile: RouterOsSyslogActionProfile): boolean {
  if (action.name !== ROUTEROS_SYSLOG_ACTION_NAME || action.target !== 'remote') return false;
  for (const key of ['remote', 'remote-port'] as const) {
    const expected = profile.parameters[key];
    if (expected !== undefined && String(action[key] ?? '') !== expected) return false;
  }
  return true;
}

export function routerOsSyslogTestCommand(topics: string): string | null {
  const enabled = normalizedTopics(topics).filter((topic) => !topic.startsWith('!'));
  for (const level of ['info', 'warning', 'error', 'critical', 'debug']) {
    if (enabled.includes(level)) return `/log/${level}`;
  }
  return null;
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
      remote: serverAddress,
      'remote-log-format': 'syslog',
      'remote-protocol': 'udp',
      'remote-port': String(port),
      'syslog-time-format': 'iso8601',
    },
  };
  const modernEndpoint: RouterOsSyslogActionProfile = {
    name: 'routeros-7.18+-endpoint',
    parameters: {
      ...shared,
      'remote-log-format': 'syslog',
      'remote-protocol': 'udp',
      'remote-port': remoteEndpoint(serverAddress, port),
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
    return [modern, modernEndpoint, compatibleMinimal];
  }
  if (parsedVersion && (parsedVersion.major < 7 || parsedVersion.major === 7)) {
    return [legacy, compatibleMinimal];
  }
  return [modern, modernEndpoint, legacy, compatibleMinimal];
}

export function isParameterCompatibilityError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  if (/unknown parameter/i.test(message)) return true;
  return (
    /(?:remote|syslog)/i.test(message) &&
    /invalid|trailing characters|expected|bad value|not (?:valid|supported)/i.test(message)
  );
}

export class SyslogRouterOsService {
  public async configure(
    deviceId: string,
    input: ConfigureRouterOsSyslogInput,
    verifyDelivery?: SyslogDeliveryVerifier,
  ) {
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
      const actions = (await client.command('/system/logging/action/print')).rows as RouterRecord[];
      const existingAction =
        actions.find((action) => action.name === ROUTEROS_SYSLOG_ACTION_NAME) ??
        actions.find((action) => action.name === LEGACY_ROUTEROS_SYSLOG_ACTION_NAME);
      let actionId = recordId(existingAction);
      const profiles = buildRouterOsSyslogActionProfiles(version, input.serverAddress, input.port);
      let appliedProfile: RouterOsSyslogActionProfile | undefined;
      let lastCompatibilityError: unknown;
      for (const profile of profiles) {
        try {
          if (actionId) {
            await client.command('/system/logging/action/set', {
              '.id': actionId,
              name: ROUTEROS_SYSLOG_ACTION_NAME,
              ...profile.parameters,
            });
          } else {
            await client.command('/system/logging/action/add', {
              name: ROUTEROS_SYSLOG_ACTION_NAME,
              ...profile.parameters,
            });
          }
          const verifiedActions = (await client.command('/system/logging/action/print'))
            .rows as RouterRecord[];
          const verifiedAction = verifiedActions.find(
            (action) => action.name === ROUTEROS_SYSLOG_ACTION_NAME,
          );
          actionId = recordId(verifiedAction);
          if (!verifiedAction || !actionId || !actionMatchesProfile(verifiedAction, profile)) {
            lastCompatibilityError = new Error(
              `RouterOS did not persist the ${ROUTEROS_SYSLOG_ACTION_NAME} remote destination for profile ${profile.name}.`,
            );
            continue;
          }
          appliedProfile = profile;
          break;
        } catch (error) {
          if (!isParameterCompatibilityError(error)) throw error;
          lastCompatibilityError = error;
        }
      }
      if (!appliedProfile) throw lastCompatibilityError;

      const rules = (await client.command('/system/logging/print')).rows as RouterRecord[];
      const matchingRules = rules.filter((rule) => isManagedActionName(rule.action));
      const ruleId = recordId(matchingRules[0]);
      if (ruleId) {
        await client.command('/system/logging/set', {
          '.id': ruleId,
          topics: input.topics,
          action: ROUTEROS_SYSLOG_ACTION_NAME,
        });
      } else {
        await client.command('/system/logging/add', {
          topics: input.topics,
          action: ROUTEROS_SYSLOG_ACTION_NAME,
        });
      }
      let duplicateRulesRemoved = 0;
      for (const duplicate of matchingRules.slice(1)) {
        const duplicateId = recordId(duplicate);
        if (!duplicateId) continue;
        await client.command('/system/logging/remove', { '.id': duplicateId });
        duplicateRulesRemoved += 1;
      }
      const verifiedRules = (await client.command('/system/logging/print')).rows as RouterRecord[];
      const verifiedRule = verifiedRules.find(
        (rule) =>
          rule.action === ROUTEROS_SYSLOG_ACTION_NAME &&
          normalizedTopics(rule.topics).join(',') === normalizedTopics(input.topics).join(','),
      );
      if (!verifiedRule || !recordId(verifiedRule)) {
        throw new Error(
          `RouterOS accepted the command but did not persist the ${ROUTEROS_SYSLOG_ACTION_NAME} logging rule.`,
        );
      }

      const finalActions = (await client.command('/system/logging/action/print'))
        .rows as RouterRecord[];
      for (const legacyAction of finalActions.filter(
        (action) => action.name === LEGACY_ROUTEROS_SYSLOG_ACTION_NAME,
      )) {
        const legacyActionId = recordId(legacyAction);
        if (!legacyActionId) continue;
        await client.command('/system/logging/action/remove', { '.id': legacyActionId });
      }

      const testCommand = routerOsSyslogTestCommand(input.topics);
      let deliveryVerified: boolean | null = null;
      let warning: string | undefined;
      if (testCommand && verifyDelivery) {
        const marker = `mme-routeros-syslog-test-${deviceId}-${Date.now()}`;
        await client.command(testCommand, { message: marker });
        deliveryVerified = await verifyDelivery(marker);
        if (!deliveryVerified) {
          warning =
            'RouterOS action/rule were verified, but its test message did not reach MME. Check the server firewall, network profile and UDP path.';
        }
      } else if (!testCommand) {
        warning =
          'RouterOS action/rule were verified. Delivery was not tested because the selected topics do not include info, warning, error, critical or debug.';
      }

      return {
        deviceId,
        deviceName: device.name,
        success: true,
        action: ROUTEROS_SYSLOG_ACTION_NAME,
        serverAddress: input.serverAddress,
        port: input.port,
        protocol: 'udp',
        topics: input.topics,
        routerOsVersion: typeof version === 'string' ? version : 'unknown',
        configurationProfile: appliedProfile.name,
        actionVerified: true,
        ruleVerified: true,
        deliveryVerified,
        warning,
        duplicateRulesRemoved,
      };
    } catch (error) {
      return {
        deviceId,
        deviceName: device.name,
        success: false,
        action: ROUTEROS_SYSLOG_ACTION_NAME,
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
