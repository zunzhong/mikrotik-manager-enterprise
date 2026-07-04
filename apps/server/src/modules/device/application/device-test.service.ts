import { RouterClient, RouterOsError } from '@mme/routeros-core';
import type { TestDeviceConnectionInput } from '../presentation/device.schemas.js';

export interface DeviceTestConnectionResult {
  online: boolean;
  identity?: string;
  version?: string;
  uptime?: string;
  cpuLoad?: number;
  freeMemory?: number;
  responseTimeMs: number;
  code?: string;
  reason?: string;
}

/**
 * DeviceTestService
 *
 * Tests RouterOS connectivity without storing credentials.
 */
export class DeviceTestService {
  public async test(input: TestDeviceConnectionInput): Promise<DeviceTestConnectionResult> {
    const startedAt = Date.now();
    const client = new RouterClient({
      host: input.host,
      port: input.port,
      username: input.username,
      password: input.password,
      tls: input.useTls,
      loginMode: input.loginMode,
      timeoutMs: input.timeoutMs,
    });

    try {
      await client.connect();

      const identity = await client.command('/system/identity/print');
      const resource = await client.command('/system/resource/print', {
        '.proplist': 'version,uptime,cpu-load,free-memory',
      });

      await client.close();

      const identityRow = identity.rows[0] ?? {};
      const resourceRow = resource.rows[0] ?? {};

      return {
        online: true,
        identity: identityRow.name,
        version: resourceRow.version,
        uptime: resourceRow.uptime,
        cpuLoad: this.toNumber(resourceRow['cpu-load']),
        freeMemory: this.toNumber(resourceRow['free-memory']),
        responseTimeMs: Date.now() - startedAt,
      };
    } catch (error) {
      await client.close().catch(() => undefined);

      const err = error as Error;

      return {
        online: false,
        code: error instanceof RouterOsError ? error.code : 'UNKNOWN_ERROR',
        reason: err.message ?? 'Unknown error',
        responseTimeMs: Date.now() - startedAt,
      };
    }
  }

  private toNumber(value: string | undefined): number | undefined {
    if (value === undefined) {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}

export const deviceTestService = new DeviceTestService();
