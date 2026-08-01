import dgram from 'node:dgram';
import net from 'node:net';
import { networkInterfaces } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { config } from '../../config/config.service.js';
import { HttpError } from '../../errors/http-error.js';
import { systemPreferencesService } from '../system/application/system-preferences.service.js';
import { SyslogFileStore, syslogFileStore } from './syslog-file.store.js';
import { SyslogFirewallService, syslogFirewallService } from './syslog-firewall.service.js';
import {
  SyslogRepository,
  syslogRepository,
  type StoredSyslogInput,
  type SyslogDeviceIdentity,
} from './syslog.repository.js';
import { SyslogReceiver } from './syslog.receiver.js';
import type {
  ReceivedSyslogMessage,
  SyslogListQuery,
  SyslogReceiverStatus,
  SyslogReceiverSettings,
} from './syslog.types.js';

function normalizeIdentity(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .replace(/^\[|\]$/g, '')
    .replace(/^::ffff:/, '')
    .replace(/\.$/, '')
    .toLowerCase();
}

function removeIdentityPrefix(value: string, identity: string): string | null {
  const candidate = identity.trim();
  if (!candidate || !value.toLowerCase().startsWith(candidate.toLowerCase())) return null;
  const boundary = value.slice(candidate.length, candidate.length + 1);
  if (boundary && !/[\s:|-]/.test(boundary)) return null;
  return value.slice(candidate.length).replace(/^[\s:|-]+/, '');
}

export function stripDeviceIdentityFromMessage(
  message: string,
  parsedHostname: string | null,
  identities: string[],
): string {
  const candidates = [
    ...new Set(identities.map((identity) => identity.trim()).filter(Boolean)),
  ].sort((left, right) => right.length - left.length);
  for (const identity of candidates) {
    const direct = removeIdentityPrefix(message, identity);
    if (direct !== null) return direct;
    if (parsedHostname) {
      const combined = `${parsedHostname} ${message}`.trim();
      const reconstructed = removeIdentityPrefix(combined, identity);
      if (reconstructed !== null) return reconstructed;
    }
  }
  return message;
}

function settingsShape(settings: SyslogReceiverSettings): SyslogReceiverSettings {
  return {
    enabled: settings.enabled,
    udpEnabled: settings.udpEnabled,
    tcpEnabled: settings.tcpEnabled,
    bindAddress: settings.bindAddress,
    port: settings.port,
    retentionDays: settings.retentionDays,
    maxRecords: settings.maxRecords,
    acceptUnmatched: settings.acceptUnmatched,
  };
}

export function receiverConfigurationError(
  settings: SyslogReceiverSettings,
  status: SyslogReceiverStatus,
): string | null {
  if (!settings.enabled) {
    return status.running ? 'The Syslog receiver is still running after it was disabled.' : null;
  }

  const missing: string[] = [];
  if (settings.udpEnabled && !status.udpListening) missing.push('UDP');
  if (settings.tcpEnabled && !status.tcpListening) missing.push('TCP');
  if (missing.length === 0) return null;

  const listener = `${settings.bindAddress}:${settings.port}`;
  return [
    `Unable to start the requested ${missing.join(' and ')} Syslog listener(s) on ${listener}.`,
    status.lastError,
  ]
    .filter(Boolean)
    .join(' ');
}

export function recommendedSyslogServerAddresses(
  interfaces?: ReturnType<typeof networkInterfaces>,
  deviceHosts: string[] = [],
): string[] {
  if (!interfaces) {
    try {
      interfaces = networkInterfaces();
    } catch {
      interfaces = {};
    }
  }
  const ipv4Number = (value: string): number | null => {
    const octets = value.split('.').map(Number);
    if (
      octets.length !== 4 ||
      octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
    )
      return null;
    return octets.reduce((result, octet) => ((result << 8) | octet) >>> 0, 0);
  };
  const addresses: Array<{ address: string; score: number }> = [];
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.internal || entry.family !== 'IPv4') continue;
      if (
        entry.address === '0.0.0.0' ||
        entry.address.startsWith('127.') ||
        entry.address.startsWith('169.254.')
      )
        continue;
      const interfaceAddress = ipv4Number(entry.address);
      const netmask = ipv4Number(entry.netmask);
      const score =
        interfaceAddress === null || netmask === null
          ? 0
          : deviceHosts.filter((host) => {
              const deviceAddress = ipv4Number(host);
              return (
                deviceAddress !== null && (interfaceAddress & netmask) === (deviceAddress & netmask)
              );
            }).length;
      addresses.push({ address: entry.address, score });
    }
  }
  return [
    ...new Set(
      addresses
        .sort((left, right) => right.score - left.score)
        .map((candidate) => candidate.address),
    ),
  ];
}

export class SyslogService {
  private identities = new Map<string, string>();
  private devicesById = new Map<string, SyslogDeviceIdentity>();
  private identityCacheAt = 0;
  private settings: SyslogReceiverSettings = config.syslog;
  private readonly receiver: SyslogReceiver;
  private retentionTimer: NodeJS.Timeout | null = null;
  private settingsUpdateQueue: Promise<void> = Promise.resolve();
  private fileStorageError: string | null = null;

  public constructor(
    private readonly repository: SyslogRepository = syslogRepository,
    receiver?: SyslogReceiver,
    private readonly firewall: SyslogFirewallService = syslogFirewallService,
    private readonly fileStore: SyslogFileStore = syslogFileStore,
  ) {
    this.receiver = receiver ?? new SyslogReceiver((messages) => this.store(messages));
  }

  public async start(): Promise<void> {
    const persisted = await this.repository.ensureSettings(config.syslog);
    this.settings = settingsShape(persisted);
    await this.refreshIdentities();
    await this.receiver.start(this.settings);
    await this.purge();
    this.retentionTimer = setInterval(() => void this.purge(), 60 * 60_000);
    this.retentionTimer.unref();
  }

  public async stop(): Promise<void> {
    if (this.retentionTimer) clearInterval(this.retentionTimer);
    this.retentionTimer = null;
    await this.receiver.stop();
  }

  public async overview() {
    const [database, persisted] = await Promise.all([
      this.repository.overview(),
      this.repository.settings(),
    ]);
    return {
      ...database,
      settings: persisted ? settingsShape(persisted) : this.settings,
      receiver: this.receiver.status(),
      fileStorage: {
        path: this.fileStore.rootPath,
        lastError: this.fileStorageError,
      },
      recommendedServerAddresses: recommendedSyslogServerAddresses(
        undefined,
        database.devices.map((device) => device.host),
      ),
    };
  }

  public async list(query: SyslogListQuery) {
    if (Date.now() - this.identityCacheAt > 60_000) await this.refreshIdentities();
    const result = await this.repository.list(query);
    return {
      ...result,
      items: result.items.map((item) => {
        const identity = item.device ? this.devicesById.get(item.device.id) : undefined;
        return {
          ...item,
          message: item.device
            ? stripDeviceIdentityFromMessage(item.message, item.hostname, [
                item.device.name,
                identity?.host ?? '',
                ...(identity?.aliases ?? []),
              ])
            : item.message,
        };
      }),
    };
  }

  public updateSettings(settings: SyslogReceiverSettings) {
    const operation = this.settingsUpdateQueue.then(() => this.applySettings(settings));
    this.settingsUpdateQueue = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }

  private async applySettings(settings: SyslogReceiverSettings) {
    const next = settingsShape(settings);
    const previous = settingsShape(this.settings);
    const nextStatus = await this.receiver.start(next);
    const startError = receiverConfigurationError(next, nextStatus);

    if (startError) {
      const rollbackStatus = await this.receiver.start(previous);
      const rollbackError = receiverConfigurationError(previous, rollbackStatus);
      throw new HttpError(
        409,
        'SYSLOG_LISTENER_START_FAILED',
        rollbackError
          ? `${startError} The previous receiver configuration could not be restored: ${rollbackError}`
          : `${startError} The previous receiver configuration was restored.`,
      );
    }

    try {
      await this.firewall.sync(next);
    } catch (error) {
      const rollbackStatus = await this.receiver.start(previous);
      const rollbackError = receiverConfigurationError(previous, rollbackStatus);
      let firewallRollbackError: string | null = null;
      try {
        await this.firewall.sync(previous);
      } catch (rollbackFailure) {
        firewallRollbackError =
          rollbackFailure instanceof Error ? rollbackFailure.message : String(rollbackFailure);
      }
      throw new HttpError(
        409,
        'SYSLOG_FIREWALL_UPDATE_FAILED',
        [
          'The Syslog listener started, but the operating-system firewall could not be updated.',
          error instanceof Error ? error.message : String(error),
          rollbackError
            ? `The previous receiver configuration could not be restored: ${rollbackError}`
            : 'The previous receiver configuration was restored.',
          firewallRollbackError
            ? `The previous firewall configuration could not be restored: ${firewallRollbackError}`
            : null,
        ]
          .filter(Boolean)
          .join(' '),
      );
    }

    try {
      const saved = await this.repository.saveSettings(next);
      this.settings = settingsShape(saved);
    } catch (error) {
      const rollbackStatus = await this.receiver.start(previous);
      this.settings = previous;
      const rollbackError = receiverConfigurationError(previous, rollbackStatus);
      let firewallRollbackError: string | null = null;
      try {
        await this.firewall.sync(previous);
      } catch (rollbackFailure) {
        firewallRollbackError =
          rollbackFailure instanceof Error ? rollbackFailure.message : String(rollbackFailure);
      }
      throw new HttpError(
        500,
        'SYSLOG_SETTINGS_PERSIST_FAILED',
        [
          'The new Syslog listener started, but its settings could not be saved.',
          rollbackError
            ? `The previous receiver configuration could not be restored: ${rollbackError}`
            : 'The previous receiver configuration was restored.',
          firewallRollbackError
            ? `The previous firewall configuration could not be restored: ${firewallRollbackError}`
            : null,
          error instanceof Error ? error.message : String(error),
        ]
          .filter(Boolean)
          .join(' '),
      );
    }

    return { settings: this.settings, receiver: this.receiver.status() };
  }

  public async addAlias(alias: string, deviceId: string) {
    const normalized = normalizeIdentity(alias);
    if (!normalized) throw new Error('Syslog source alias cannot be empty.');
    const saved = await this.repository.saveAlias(alias.trim(), normalized, deviceId);
    await this.refreshIdentities(true);
    return saved;
  }

  public async deleteAlias(id: string) {
    const result = await this.repository.deleteAlias(id);
    await this.refreshIdentities(true);
    return result;
  }

  public invalidateIdentityCache(): void {
    this.identities.clear();
    this.devicesById.clear();
    this.identityCacheAt = 0;
  }

  public async purge() {
    const [database, filesDeleted] = await Promise.all([
      this.repository.purge(this.settings.retentionDays, this.settings.maxRecords),
      this.fileStore.purge(
        this.settings.retentionDays,
        new Date(),
        systemPreferencesService.get().timeZone,
      ),
    ]);
    return { ...database, filesDeleted };
  }

  public async clearAll() {
    const [database, filesDeleted] = await Promise.all([
      this.repository.clearAll(),
      this.fileStore.clear(),
    ]);
    return { ...database, filesDeleted };
  }

  public async dailyFile(deviceId: string, date: string) {
    if (Date.now() - this.identityCacheAt > 60_000) await this.refreshIdentities();
    const device = this.devicesById.get(deviceId);
    if (!device) throw new HttpError(404, 'SYSLOG_DEVICE_NOT_FOUND', 'Device not found.');
    return this.fileStore.dailyFile(deviceId, device.name, date);
  }

  public async testReceiver() {
    const before = this.receiver.status();
    if (!before.running) {
      return {
        success: false,
        message: before.lastError ?? 'The Syslog receiver is not running.',
        receiver: before,
      };
    }

    const marker = `mme-syslog-self-test-${process.pid}-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`;
    const payload = `<134>1 ${new Date().toISOString()} mme-self-test MME ${process.pid} SYSLOG_TEST - ${marker}`;
    if (before.udpListening) {
      await new Promise<void>((resolve, reject) => {
        const socket = dgram.createSocket(
          this.settings.bindAddress.includes(':') ? 'udp6' : 'udp4',
        );
        socket.send(
          payload,
          this.settings.port,
          this.settings.bindAddress === '0.0.0.0'
            ? '127.0.0.1'
            : this.settings.bindAddress === '::'
              ? '::1'
              : this.settings.bindAddress,
          (error) => {
            socket.close();
            if (error) reject(error);
            else resolve();
          },
        );
      });
    } else {
      await new Promise<void>((resolve, reject) => {
        const socket = net.createConnection(
          {
            host:
              this.settings.bindAddress === '0.0.0.0'
                ? '127.0.0.1'
                : this.settings.bindAddress === '::'
                  ? '::1'
                  : this.settings.bindAddress,
            port: this.settings.port,
          },
          () => socket.end(`${Buffer.byteLength(payload)} ${payload}`),
        );
        socket.on('close', resolve);
        socket.on('error', reject);
      });
    }

    let stored = false;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      await delay(100);
      await this.receiver.flush();
      const result = await this.repository.list({
        page: 1,
        pageSize: 1,
        search: marker,
      });
      if (result.total > 0) {
        stored = true;
        break;
      }
    }
    const after = this.receiver.status();
    return {
      success: stored,
      message: stored
        ? 'A test message passed through the Syslog listener, parser and database.'
        : (after.lastError ?? 'The test message was not stored within 5 seconds.'),
      receiver: after,
    };
  }

  public async waitForStoredMessage(marker: string, timeoutMs = 6000): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await delay(100);
      await this.receiver.flush();
      const result = await this.repository.list({
        page: 1,
        pageSize: 1,
        search: marker,
      });
      if (result.total > 0) return true;
    }
    return false;
  }

  private async store(messages: ReceivedSyslogMessage[]): Promise<number> {
    if (Date.now() - this.identityCacheAt > 60_000) await this.refreshIdentities();
    const records: StoredSyslogInput[] = [];
    for (const message of messages) {
      const candidates = [
        normalizeIdentity(message.sourceAddress),
        normalizeIdentity(message.hostname),
      ].filter(Boolean);
      let deviceId: string | null = null;
      for (const candidate of candidates) {
        const matched = this.identities.get(candidate);
        if (matched) {
          deviceId = matched;
          break;
        }
      }
      if (deviceId || this.settings.acceptUnmatched || message.messageId === 'SYSLOG_TEST') {
        const device = deviceId ? this.devicesById.get(deviceId) : undefined;
        records.push({
          ...message,
          deviceId,
          message: device
            ? stripDeviceIdentityFromMessage(message.message, message.hostname, [
                device.name,
                ...device.aliases,
              ])
            : message.message,
        });
      }
    }
    const stored = await this.repository.insertMany(records);
    try {
      await this.fileStore.appendMany(
        records.map((record) => ({
          ...record,
          deviceName: record.deviceId
            ? (this.devicesById.get(record.deviceId)?.name ?? null)
            : null,
        })),
        systemPreferencesService.get().timeZone,
      );
      this.fileStorageError = null;
    } catch (error) {
      this.fileStorageError = error instanceof Error ? error.message : String(error);
    }
    return stored;
  }

  private async refreshIdentities(force = false): Promise<void> {
    if (!force && Date.now() - this.identityCacheAt < 10_000) return;
    const devices = await this.repository.deviceIdentities();
    const identities = new Map<string, string>();
    for (const device of devices) {
      for (const value of [device.host, device.name, ...device.aliases]) {
        const normalized = normalizeIdentity(value);
        if (normalized && !identities.has(normalized)) identities.set(normalized, device.id);
      }
    }
    this.identities = identities;
    this.devicesById = new Map(devices.map((device) => [device.id, device]));
    this.identityCacheAt = Date.now();
  }
}

export const syslogService = new SyslogService();
export { normalizeIdentity };
