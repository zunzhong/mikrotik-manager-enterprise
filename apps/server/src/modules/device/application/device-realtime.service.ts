import { RouterOsClient } from '@mme/routeros-sdk';
import { HttpError } from '../../../errors/http-error.js';
import { encryptionService } from '../../../security/encryption.service.js';
import { deviceRepository } from '../infrastructure/device.repository.js';

export interface DeviceRealtimeSnapshot {
  deviceId: string;
  collectedAt: string;
  online: boolean;
  latencyMs: number;
  error?: string;
  resource?: object;
  health?: object[];
  interfaces?: object[];
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

async function safePrint(client: RouterOsClient, path: string): Promise<object[]> {
  try {
    return await client.print(path);
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

export class DeviceRealtimeService {
  private readonly cache = new Map<string, DeviceRealtimeCacheEntry>();

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

      const [resource, health, interfaces] = await Promise.all([
        client.system.resource().then((data) => ({ ...data })),
        safePrint(client, '/system/health/print'),
        safePrint(client, '/interface/print'),
      ]);

      const snapshot: DeviceRealtimeSnapshot = {
        deviceId,
        collectedAt: new Date().toISOString(),
        online: true,
        latencyMs: Date.now() - startedAt,
        resource,
        health,
        interfaces,
      };

      return this.storeSnapshot(deviceId, snapshot, ttlMs, source, options.pollIntervalMs);
    } catch (error) {
      const snapshot: DeviceRealtimeSnapshot = {
        deviceId,
        collectedAt: new Date().toISOString(),
        online: false,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'Realtime refresh failed',
      };

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
  }

  public clearAll(): void {
    this.cache.clear();
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
}

export const deviceRealtimeService = new DeviceRealtimeService();
