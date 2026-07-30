import dgram from 'node:dgram';
import net from 'node:net';
import { networkInterfaces } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { config } from '../../config/config.service.js';
import { syslogRepository, type StoredSyslogInput } from './syslog.repository.js';
import { SyslogReceiver } from './syslog.receiver.js';
import type {
  ReceivedSyslogMessage,
  SyslogListQuery,
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
  private identityCacheAt = 0;
  private settings: SyslogReceiverSettings = config.syslog;
  private readonly receiver = new SyslogReceiver((messages) => this.store(messages));
  private retentionTimer: NodeJS.Timeout | null = null;

  public async start(): Promise<void> {
    const persisted = await syslogRepository.ensureSettings(config.syslog);
    this.settings = settingsShape(persisted);
    await this.refreshIdentities();
    await this.receiver.start(this.settings);
    await syslogRepository.purge(this.settings.retentionDays, this.settings.maxRecords);
    this.retentionTimer = setInterval(
      () => void syslogRepository.purge(this.settings.retentionDays, this.settings.maxRecords),
      60 * 60_000,
    );
    this.retentionTimer.unref();
  }

  public async stop(): Promise<void> {
    if (this.retentionTimer) clearInterval(this.retentionTimer);
    this.retentionTimer = null;
    await this.receiver.stop();
  }

  public async overview() {
    const [database, persisted] = await Promise.all([
      syslogRepository.overview(),
      syslogRepository.settings(),
    ]);
    return {
      ...database,
      settings: persisted ? settingsShape(persisted) : this.settings,
      receiver: this.receiver.status(),
      recommendedServerAddresses: recommendedSyslogServerAddresses(
        undefined,
        database.devices.map((device) => device.host),
      ),
    };
  }

  public list(query: SyslogListQuery) {
    return syslogRepository.list(query);
  }

  public async updateSettings(settings: SyslogReceiverSettings) {
    const saved = await syslogRepository.saveSettings(settings);
    this.settings = settingsShape(saved);
    await this.receiver.start(this.settings);
    return { settings: this.settings, receiver: this.receiver.status() };
  }

  public async addAlias(alias: string, deviceId: string) {
    const normalized = normalizeIdentity(alias);
    if (!normalized) throw new Error('Syslog source alias cannot be empty.');
    const saved = await syslogRepository.saveAlias(alias.trim(), normalized, deviceId);
    await this.refreshIdentities(true);
    return saved;
  }

  public async deleteAlias(id: string) {
    const result = await syslogRepository.deleteAlias(id);
    await this.refreshIdentities(true);
    return result;
  }

  public purge() {
    return syslogRepository.purge(this.settings.retentionDays, this.settings.maxRecords);
  }

  public clearAll() {
    return syslogRepository.clearAll();
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
      const result = await syslogRepository.list({
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
      if (deviceId || this.settings.acceptUnmatched || message.messageId === 'SYSLOG_TEST')
        records.push({ ...message, deviceId });
    }
    return syslogRepository.insertMany(records);
  }

  private async refreshIdentities(force = false): Promise<void> {
    if (!force && Date.now() - this.identityCacheAt < 10_000) return;
    const devices = await syslogRepository.deviceIdentities();
    const identities = new Map<string, string>();
    for (const device of devices) {
      for (const value of [device.host, device.name, ...device.aliases]) {
        const normalized = normalizeIdentity(value);
        if (normalized && !identities.has(normalized)) identities.set(normalized, device.id);
      }
    }
    this.identities = identities;
    this.identityCacheAt = Date.now();
  }
}

export const syslogService = new SyslogService();
export { normalizeIdentity };
