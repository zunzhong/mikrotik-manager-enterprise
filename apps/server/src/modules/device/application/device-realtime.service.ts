import { RouterOsClient } from '@mme/routeros-sdk';
import { createHash } from 'node:crypto';
import { HttpError } from '../../../errors/http-error.js';
import { encryptionService } from '../../../security/encryption.service.js';
import { eventBus, type AppEventSeverity, type AppEventType } from '../../events/index.js';
import {
  calculateHealthScore,
  type HealthIssue,
  type HealthReport,
  type RouterOsHealthLike,
  type RouterOsResourceLike,
} from '../health/index.js';
import { deviceRepository } from '../infrastructure/device.repository.js';
import { routerOsLogFingerprintRepository } from '../infrastructure/routeros-log-fingerprint.repository.js';
import { deviceTrafficMonitorService } from './device-traffic-monitor.service.js';

export interface DeviceRealtimeSnapshot {
  deviceId: string;
  deviceName?: string;
  collectedAt: string;
  online: boolean;
  latencyMs: number;
  error?: string;
  resource?: object;
  identity?: object;
  routerboard?: object;
  health?: object[];
  interfaces?: object[];
  logs?: object[];
  healthReport?: HealthReport;
}

export interface DeviceRealtimeCacheEntry {
  snapshot: DeviceRealtimeSnapshot;
  expiresAt: number;
  lastPollAt: string;
  nextPollAt?: string;
  pollIntervalMs?: number;
  source: 'manual' | 'scheduler' | 'cache-miss';
}

export interface DeviceRealtimeView extends DeviceRealtimeSnapshot {
  cache: {
    source: DeviceRealtimeCacheEntry['source'];
    expiresAt: string;
    cacheAgeMs: number;
    lastPollAt: string;
    nextPollAt?: string;
    pollIntervalMs?: number;
  };
}

const DEFAULT_TTL_MS = 5000;
const ROUTEROS_LOG_POLL_INTERVAL_MS = 60000;

async function safePrint<T extends object = object>(
  client: RouterOsClient,
  path: string,
): Promise<T[]> {
  try {
    return (await client.print(path)) as T[];
  } catch {
    return [];
  }
}

function toView(entry: DeviceRealtimeCacheEntry): DeviceRealtimeView {
  return {
    ...entry.snapshot,
    cache: {
      source: entry.source,
      expiresAt: new Date(entry.expiresAt).toISOString(),
      cacheAgeMs: Math.max(0, Date.now() - new Date(entry.snapshot.collectedAt).getTime()),
      lastPollAt: entry.lastPollAt,
      nextPollAt: entry.nextPollAt,
      pollIntervalMs: entry.pollIntervalMs,
    },
  };
}

function issueFingerprint(issues: HealthIssue[]): string {
  return issues
    .map((issue) => `${issue.code}:${issue.status}:${issue.value ?? ''}:${issue.threshold ?? ''}`)
    .sort()
    .join('|');
}

function eventTypeFromIssue(issue: HealthIssue): AppEventType {
  switch (issue.code) {
    case 'CPU_HIGH':
      return 'CPU_HIGH';
    case 'MEMORY_LOW':
      return 'MEMORY_LOW';
    case 'DISK_LOW':
      return 'DISK_LOW';
    case 'TEMPERATURE_HIGH':
      return 'TEMPERATURE_HIGH';
    default:
      return issue.status === 'critical' ? 'DEVICE_CRITICAL' : 'DEVICE_WARNING';
  }
}

function severityFromIssue(issue: HealthIssue): AppEventSeverity {
  if (issue.status === 'critical') return 'critical';
  if (issue.status === 'warning') return 'warning';
  return 'info';
}

function recordValue(record: object, key: string): unknown {
  return (record as Record<string, unknown>)[key];
}

function recordText(record: object, key: string): string {
  const value = recordValue(record, key);
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function routerOsBoolean(value: unknown): boolean {
  return value === true || value === 'true' || value === 'yes' || value === '1';
}

function identityName(identity: object | undefined, fallback: string): string {
  const name = identity ? recordText(identity, 'name') : '';
  return name || fallback;
}

function interfaceState(interfaces: object[]): Map<string, boolean> {
  return new Map(
    interfaces
      .map(
        (item) =>
          [recordText(item, 'name'), routerOsBoolean(recordValue(item, 'running'))] as const,
      )
      .filter(([name]) => name.length > 0),
  );
}

function routerOsLogTime(log: object): string {
  return recordText(log, '_mmeRouterOccurredAt') || recordText(log, 'time');
}

function logsWithRouterDate(logs: object[], clock: object | undefined): object[] {
  const routerDate = clock ? recordText(clock, 'date') : '';
  if (!routerDate) return logs;
  return logs.map((log) => {
    const rawTime = recordText(log, 'time');
    const occurredAt = /^\d{1,2}:\d{2}:\d{2}(?:\.\d+)?$/.test(rawTime)
      ? `${routerDate} ${rawTime}`
      : rawTime;
    return occurredAt ? { ...log, _mmeRouterOccurredAt: occurredAt } : log;
  });
}

export function routerOsLogFingerprint(log: object): string {
  const stableValue = [
    routerOsLogTime(log).toLowerCase(),
    recordText(log, 'topics').toLowerCase(),
    recordText(log, 'message').replace(/\s+/g, ' ').trim().toLowerCase(),
  ].join('|');
  return createHash('sha256').update(stableValue).digest('hex');
}

export function routerOsLogAlertMessage(log: object): string {
  const topics = recordText(log, 'topics').toLowerCase();
  const searchable = `${topics} ${recordText(log, 'message')}`.toLowerCase();
  const kind = /login.*fail|fail.*login|auth(?:entication)?.*fail/.test(searchable)
    ? 'login failed'
    : topics
          .split(',')
          .map((topic) => topic.trim())
          .includes('error')
      ? 'error'
      : 'warning';
  const logTime = routerOsLogTime(log) || 'Không rõ thời gian RouterOS';
  const message = recordText(log, 'message') || '(empty RouterOS log message)';
  return `${logTime}: RouterOS ${kind}: ${message}`;
}

export class DeviceRealtimeService {
  private readonly cache = new Map<string, DeviceRealtimeCacheEntry>();
  private readonly clients = new Map<string, { key: string; client: RouterOsClient }>();
  private readonly refreshes = new Map<string, Promise<DeviceRealtimeView>>();
  private readonly lastOnlineState = new Map<string, boolean>();
  private readonly lastHealthFingerprint = new Map<string, string>();
  private readonly lastInterfaceState = new Map<string, Map<string, boolean>>();
  private readonly lastLogPollAt = new Map<string, number>();
  private readonly lastDeviceIdentity = new Map<string, string>();

  public async getSnapshot(deviceId: string, ttlMs = DEFAULT_TTL_MS): Promise<DeviceRealtimeView> {
    const cached = this.cache.get(deviceId);

    if (cached && cached.expiresAt > Date.now()) {
      return toView(cached);
    }

    return this.refreshSnapshot(deviceId, {
      ttlMs,
      source: 'cache-miss',
    });
  }

  public async refreshSnapshot(
    deviceId: string,
    options: {
      ttlMs?: number;
      source?: DeviceRealtimeCacheEntry['source'];
      pollIntervalMs?: number;
    } = {},
  ): Promise<DeviceRealtimeView> {
    const pending = this.refreshes.get(deviceId);
    if (pending) return pending;
    const refresh = this.performRefreshSnapshot(deviceId, options).finally(() => {
      if (this.refreshes.get(deviceId) === refresh) this.refreshes.delete(deviceId);
    });
    this.refreshes.set(deviceId, refresh);
    return refresh;
  }

  private async performRefreshSnapshot(
    deviceId: string,
    options: {
      ttlMs?: number;
      source?: DeviceRealtimeCacheEntry['source'];
      pollIntervalMs?: number;
    },
  ): Promise<DeviceRealtimeView> {
    const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    const source = options.source ?? 'manual';
    const device = await deviceRepository.findById(deviceId);

    if (!device) {
      throw new HttpError(404, 'DEVICE_NOT_FOUND', 'Device not found');
    }

    const startedAt = Date.now();
    let client: RouterOsClient | undefined;

    try {
      const password = encryptionService.decrypt(device.passwordEncrypted);
      const connectionKey = createHash('sha256')
        .update(
          JSON.stringify({
            host: device.host,
            port: device.port,
            username: device.username,
            password,
            useTls: device.useTls,
          }),
        )
        .digest('hex');
      const existing = this.clients.get(deviceId);
      if (existing?.key === connectionKey) {
        client = existing.client;
      } else {
        existing?.client.close();
        client = new RouterOsClient({
          host: device.host,
          port: device.port,
          username: device.username,
          password,
          tls: device.useTls,
          timeoutMs: 10000,
          rejectUnauthorized: false,
        });
        await client.connect();
        this.clients.set(deviceId, { key: connectionKey, client });
      }

      // Do not overlap commands on one RouterOS sentence stream.
      const identity = (await safePrint(client, '/system/identity/print'))[0] ?? {};
      const resource = { ...(await client.system.resource()) } as RouterOsResourceLike;
      const routerboard = (await safePrint(client, '/system/routerboard/print'))[0] ?? {};
      const health = await safePrint<RouterOsHealthLike>(client, '/system/health/print');
      const interfaces = await safePrint(client, '/interface/print');
      const lastLogPollAt = this.lastLogPollAt.get(deviceId) ?? 0;
      const shouldPollLogs =
        source !== 'scheduler' || Date.now() - lastLogPollAt >= ROUTEROS_LOG_POLL_INTERVAL_MS;
      const routerClock = shouldPollLogs
        ? (await safePrint(client, '/system/clock/print'))[0]
        : undefined;
      const logs = shouldPollLogs
        ? logsWithRouterDate(await safePrint(client, '/log/print'), routerClock)
        : undefined;
      if (shouldPollLogs) this.lastLogPollAt.set(deviceId, Date.now());

      const healthReport = calculateHealthScore(resource, health);

      const snapshot: DeviceRealtimeSnapshot = {
        deviceId,
        deviceName: device.name,
        collectedAt: new Date().toISOString(),
        online: true,
        latencyMs: Date.now() - startedAt,
        resource,
        identity,
        routerboard,
        health,
        interfaces,
        logs,
        healthReport,
      };

      // Việc lưu lịch sử traffic là tác vụ phụ. Lỗi ghi database không được phép
      // biến một router đang online thành offline hoặc che mất dữ liệu realtime.
      try {
        await deviceTrafficMonitorService.record(deviceId, interfaces, snapshot.collectedAt);
      } catch {
        // Giữ snapshot realtime và để lần polling kế tiếp thử ghi lại.
      }

      await deviceRepository.update(deviceId, {
        status: healthReport.status === 'healthy' ? 'online' : 'degraded',
        lastSeenAt: new Date(),
        lastError: null,
      });

      await this.publishRealtimeEvents(device.id, device.name, snapshot);

      return this.storeSnapshot(deviceId, snapshot, ttlMs, source, options.pollIntervalMs);
    } catch (error) {
      client?.close();
      this.clients.delete(deviceId);
      const snapshot: DeviceRealtimeSnapshot = {
        deviceId,
        deviceName: device.name,
        collectedAt: new Date().toISOString(),
        online: false,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'Realtime refresh failed',
      };

      await deviceRepository.update(deviceId, {
        status: 'offline',
        lastError: snapshot.error ?? 'Realtime refresh failed',
      });

      await this.publishRealtimeEvents(device.id, device.name, snapshot);

      return this.storeSnapshot(deviceId, snapshot, ttlMs, source, options.pollIntervalMs);
    }
  }

  public peek(deviceId: string): DeviceRealtimeView | null {
    const entry = this.cache.get(deviceId);
    return entry ? toView(entry) : null;
  }

  public listCached(): DeviceRealtimeView[] {
    return [...this.cache.values()]
      .sort((a, b) => b.expiresAt - a.expiresAt)
      .map((entry) => toView(entry));
  }

  public clear(deviceId: string): void {
    this.clients.get(deviceId)?.client.close();
    this.clients.delete(deviceId);
    this.cache.delete(deviceId);
    this.lastOnlineState.delete(deviceId);
    this.lastHealthFingerprint.delete(deviceId);
    this.lastInterfaceState.delete(deviceId);
    this.lastLogPollAt.delete(deviceId);
    this.lastDeviceIdentity.delete(deviceId);
  }

  public clearAll(): void {
    for (const { client } of this.clients.values()) client.close();
    this.clients.clear();
    this.cache.clear();
    this.lastOnlineState.clear();
    this.lastHealthFingerprint.clear();
    this.lastInterfaceState.clear();
    this.lastLogPollAt.clear();
    this.lastDeviceIdentity.clear();
  }

  private storeSnapshot(
    deviceId: string,
    snapshot: DeviceRealtimeSnapshot,
    ttlMs: number,
    source: DeviceRealtimeCacheEntry['source'],
    pollIntervalMs?: number,
  ): DeviceRealtimeView {
    const expiresAt = Date.now() + ttlMs;
    const entry: DeviceRealtimeCacheEntry = {
      snapshot,
      expiresAt,
      lastPollAt: snapshot.collectedAt,
      nextPollAt: pollIntervalMs ? new Date(Date.now() + pollIntervalMs).toISOString() : undefined,
      pollIntervalMs,
      source,
    };

    this.cache.set(deviceId, entry);

    return toView(entry);
  }

  private async publishRealtimeEvents(
    deviceId: string,
    deviceName: string,
    snapshot: DeviceRealtimeSnapshot,
  ): Promise<void> {
    const previousOnline = this.lastOnlineState.get(deviceId);
    const identityFromSnapshot = identityName(snapshot.identity, '');
    if (identityFromSnapshot) this.lastDeviceIdentity.set(deviceId, identityFromSnapshot);
    const deviceIdentity =
      identityFromSnapshot || this.lastDeviceIdentity.get(deviceId) || deviceName;

    const shouldPublishOnlineState =
      previousOnline !== snapshot.online && (previousOnline !== undefined || !snapshot.online);
    if (previousOnline !== snapshot.online) {
      this.lastOnlineState.set(deviceId, snapshot.online);
    }

    if (shouldPublishOnlineState) {
      eventBus.publish({
        type: snapshot.online ? 'DEVICE_ONLINE' : 'DEVICE_OFFLINE',
        severity: snapshot.online ? 'success' : 'critical',
        title: snapshot.online ? 'Device online' : 'Device offline',
        message: snapshot.online
          ? `${deviceName} is reachable via RouterOS API.`
          : `${deviceName} is not reachable via RouterOS API.`,
        source: 'realtime-engine',
        deviceId,
        deviceName,
        metadata: {
          latencyMs: snapshot.latencyMs,
          error: snapshot.error,
          collectedAt: snapshot.collectedAt,
          deviceIdentity,
        },
      });
    }

    if (!snapshot.online || !snapshot.healthReport) {
      return;
    }

    this.publishInterfaceEvents(deviceId, deviceName, deviceIdentity, snapshot);
    await this.publishLogEvents(deviceId, deviceName, deviceIdentity, snapshot);

    const currentFingerprint = issueFingerprint(snapshot.healthReport.issues);
    const previousFingerprint = this.lastHealthFingerprint.get(deviceId) ?? '';

    if (currentFingerprint === previousFingerprint) {
      return;
    }

    this.lastHealthFingerprint.set(deviceId, currentFingerprint);

    if (snapshot.healthReport.issues.length === 0) {
      if (previousFingerprint.length > 0) {
        eventBus.publish({
          type: 'DEVICE_ONLINE',
          severity: 'success',
          title: 'Device health recovered',
          message: `${deviceName} recovered and has no active health issues.`,
          source: 'health-engine',
          deviceId,
          deviceName,
          metadata: {
            score: snapshot.healthReport.score,
            status: snapshot.healthReport.status,
            collectedAt: snapshot.collectedAt,
            deviceIdentity,
          },
        });
      }

      return;
    }

    for (const issue of snapshot.healthReport.issues) {
      eventBus.publish({
        type: eventTypeFromIssue(issue),
        severity: severityFromIssue(issue),
        title: issue.title,
        message: issue.message,
        source: 'health-engine',
        deviceId,
        deviceName,
        metadata: {
          code: issue.code,
          status: issue.status,
          score: snapshot.healthReport.score,
          value: issue.value,
          threshold: issue.threshold,
          unit: issue.unit,
          recommendation: issue.recommendation,
          collectedAt: snapshot.collectedAt,
          deviceIdentity,
        },
      });
    }
  }

  private publishInterfaceEvents(
    deviceId: string,
    deviceName: string,
    deviceIdentity: string,
    snapshot: DeviceRealtimeSnapshot,
  ): void {
    const current = interfaceState(snapshot.interfaces ?? []);
    const previous = this.lastInterfaceState.get(deviceId);
    this.lastInterfaceState.set(deviceId, current);
    if (!previous) return;

    for (const [name, running] of current) {
      const wasRunning = previous.get(name);
      if (wasRunning === undefined || wasRunning === running) continue;
      eventBus.publish({
        type: running ? 'INTERFACE_UP' : 'INTERFACE_DOWN',
        severity: 'critical',
        title: running ? 'Interface changed to Up' : 'Interface changed to Down',
        message: `${deviceIdentity}: interface ${name} changed from ${wasRunning ? 'Up' : 'Down'} to ${running ? 'Up' : 'Down'}.`,
        source: 'realtime-engine',
        deviceId,
        deviceName,
        metadata: {
          deviceIdentity,
          interfaceName: name,
          previousRunning: wasRunning,
          running,
          collectedAt: snapshot.collectedAt,
        },
      });
    }
  }

  private async publishLogEvents(
    deviceId: string,
    deviceName: string,
    deviceIdentity: string,
    snapshot: DeviceRealtimeSnapshot,
  ): Promise<void> {
    if (!snapshot.logs) return;
    const logs = snapshot.logs;
    const hasBaseline = await routerOsLogFingerprintRepository.isInitialized(deviceId);

    for (const log of logs) {
      const fingerprint = routerOsLogFingerprint(log);
      const topics = recordText(log, 'topics').toLowerCase();
      const message = recordText(log, 'message');
      const searchable = `${topics} ${message}`.toLowerCase();
      const loginFailed = /login.*fail|fail.*login|auth(?:entication)?.*fail/.test(searchable);
      const topicList = topics.split(',').map((topic) => topic.trim());
      const isError = topicList.includes('error');
      const isWarning = topicList.includes('warning');
      if (!loginFailed && !isError && !isWarning) continue;

      const logTime = routerOsLogTime(log);
      const isNew = await routerOsLogFingerprintRepository.remember({
        deviceId,
        fingerprint,
        logTime: logTime || undefined,
        topics: topics || undefined,
        message: message || undefined,
      });
      if (!isNew || !hasBaseline) continue;

      eventBus.publish({
        type: loginFailed
          ? 'ROUTEROS_LOGIN_FAILED'
          : isError
            ? 'ROUTEROS_LOG_ERROR'
            : 'ROUTEROS_LOG_WARNING',
        severity: loginFailed || isError ? 'critical' : 'warning',
        title: loginFailed
          ? 'RouterOS login failed'
          : isError
            ? 'RouterOS error log'
            : 'RouterOS warning log',
        message: routerOsLogAlertMessage(log),
        source: 'routeros-log',
        deviceId,
        deviceName,
        metadata: {
          deviceIdentity,
          routerOsLog: log as Record<string, unknown>,
          topics,
          logTime,
          routerOsOccurredAt: logTime,
          collectedAt: snapshot.collectedAt,
        },
      });
    }

    if (!hasBaseline) await routerOsLogFingerprintRepository.markInitialized(deviceId);
    await routerOsLogFingerprintRepository.prune(deviceId);
  }
}

export const deviceRealtimeService = new DeviceRealtimeService();
