import { RouterOsClient } from '@mme/routeros-sdk';
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

export class DeviceRealtimeService {
  private readonly cache = new Map<string, DeviceRealtimeCacheEntry>();
  private readonly lastOnlineState = new Map<string, boolean>();
  private readonly lastHealthFingerprint = new Map<string, string>();

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
    const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    const source = options.source ?? 'manual';
    const device = await deviceRepository.findById(deviceId);

    if (!device) {
      throw new HttpError(404, 'DEVICE_NOT_FOUND', 'Device not found');
    }

    const startedAt = Date.now();
    const client = new RouterOsClient({
      host: device.host,
      port: device.port,
      username: device.username,
      password: encryptionService.decrypt(device.passwordEncrypted),
      tls: device.useTls,
      timeoutMs: 10000,
      rejectUnauthorized: false,
    });

    try {
      await client.connect();

      // Do not overlap commands on one RouterOS sentence stream.
      const identity = (await safePrint(client, '/system/identity/print'))[0] ?? {};
      const resource = { ...(await client.system.resource()) } as RouterOsResourceLike;
      const routerboard = (await safePrint(client, '/system/routerboard/print'))[0] ?? {};
      const health = await safePrint<RouterOsHealthLike>(client, '/system/health/print');
      const interfaces = await safePrint(client, '/interface/print');

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
        healthReport,
      };

      await deviceRepository.update(deviceId, {
        status: healthReport.status === 'healthy' ? 'online' : 'degraded',
        lastSeenAt: new Date(),
        lastError: null,
      });

      this.publishRealtimeEvents(device.id, device.name, snapshot);

      return this.storeSnapshot(deviceId, snapshot, ttlMs, source, options.pollIntervalMs);
    } catch (error) {
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

      this.publishRealtimeEvents(device.id, device.name, snapshot);

      return this.storeSnapshot(deviceId, snapshot, ttlMs, source, options.pollIntervalMs);
    } finally {
      client.close();
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
    this.cache.delete(deviceId);
    this.lastOnlineState.delete(deviceId);
    this.lastHealthFingerprint.delete(deviceId);
  }

  public clearAll(): void {
    this.cache.clear();
    this.lastOnlineState.clear();
    this.lastHealthFingerprint.clear();
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

  private publishRealtimeEvents(
    deviceId: string,
    deviceName: string,
    snapshot: DeviceRealtimeSnapshot,
  ): void {
    const previousOnline = this.lastOnlineState.get(deviceId);

    if (previousOnline !== snapshot.online) {
      this.lastOnlineState.set(deviceId, snapshot.online);

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
        },
      });
    }

    if (!snapshot.online || !snapshot.healthReport) {
      return;
    }

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
        },
      });
    }
  }
}

export const deviceRealtimeService = new DeviceRealtimeService();
