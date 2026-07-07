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
}

const DEFAULT_TTL_MS = 5000;

async function safePrint(client: RouterOsClient, path: string): Promise<object[]> {
  try {
    return await client.print(path);
  } catch {
    return [];
  }
}

export class DeviceRealtimeService {
  private readonly cache = new Map<string, DeviceRealtimeCacheEntry>();

  public async getSnapshot(deviceId: string, ttlMs = DEFAULT_TTL_MS): Promise<DeviceRealtimeSnapshot> {
    const cached = this.cache.get(deviceId);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.snapshot;
    }

    return this.refreshSnapshot(deviceId, ttlMs);
  }

  public async refreshSnapshot(deviceId: string, ttlMs = DEFAULT_TTL_MS): Promise<DeviceRealtimeSnapshot> {
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

      this.cache.set(deviceId, {
        snapshot,
        expiresAt: Date.now() + ttlMs,
      });

      return snapshot;
    } catch (error) {
      const snapshot: DeviceRealtimeSnapshot = {
        deviceId,
        collectedAt: new Date().toISOString(),
        online: false,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'Realtime refresh failed',
      };

      this.cache.set(deviceId, {
        snapshot,
        expiresAt: Date.now() + ttlMs,
      });

      return snapshot;
    } finally {
      client.close();
    }
  }

  public peek(deviceId: string): DeviceRealtimeSnapshot | null {
    return this.cache.get(deviceId)?.snapshot ?? null;
  }

  public clear(deviceId: string): void {
    this.cache.delete(deviceId);
  }
}

export const deviceRealtimeService = new DeviceRealtimeService();
