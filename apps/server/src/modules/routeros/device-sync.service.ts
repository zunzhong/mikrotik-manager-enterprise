import { RouterOsClient } from '@mme/routeros-sdk';
import type { RouterOsProbeInput } from './routeros-sdk.adapter.js';
import { routerOsProbeInputSchema } from './routeros-sdk.adapter.js';

interface NormalizedRouterOsInput {
  host: string;
  port: number;
  username: string;
  password: string;
  timeoutMs: number;
  tls: boolean;
  rejectUnauthorized: boolean;
}

export interface DeviceSyncSnapshot {
  collectedAt: string;
  latencyMs: number;
  online: boolean;
  error?: string;
  identity?: object;
  resource?: object;
  routerboard?: object;
  health?: object[];
  services?: object[];
  interfaces?: object[];
  addresses?: object[];
  routes?: object[];
  packages?: object[];
}

function normalizeInput(input: RouterOsProbeInput): NormalizedRouterOsInput {
  const parsed = routerOsProbeInputSchema.parse(input);
  const tls = parsed.tls ?? parsed.useTls ?? false;

  return {
    host: parsed.host,
    port: parsed.port ?? (tls ? 8729 : 8728),
    username: parsed.username,
    password: parsed.password ?? '',
    timeoutMs: parsed.timeoutMs ?? 10000,
    tls,
    rejectUnauthorized: parsed.rejectUnauthorized ?? false,
  };
}

async function safePrint(client: RouterOsClient, path: string): Promise<object[]> {
  try {
    return await client.print(path);
  } catch {
    return [];
  }
}

export class DeviceSyncService {
  public async collect(input: RouterOsProbeInput): Promise<DeviceSyncSnapshot> {
    const startedAt = Date.now();
    const client = new RouterOsClient(normalizeInput(input));

    try {
      await client.connect();

      const [
        identity,
        resource,
        routerboard,
        health,
        services,
        interfaces,
        addresses,
        routes,
        packages,
      ] = await Promise.all([
        client.system.identity().then((data) => ({ ...data })),
        client.system.resource().then((data) => ({ ...data })),
        client.system.routerboard().then((data) => ({ ...data })),
        safePrint(client, '/system/health/print'),
        safePrint(client, '/ip/service/print'),
        safePrint(client, '/interface/print'),
        safePrint(client, '/ip/address/print'),
        safePrint(client, '/ip/route/print'),
        safePrint(client, '/system/package/print'),
      ]);

      return {
        collectedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
        online: true,
        identity,
        resource,
        routerboard,
        health,
        services,
        interfaces,
        addresses,
        routes,
        packages,
      };
    } catch (error) {
      return {
        collectedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
        online: false,
        error: error instanceof Error ? error.message : 'RouterOS sync failed',
      };
    } finally {
      client.close();
    }
  }
}

export const deviceSyncService = new DeviceSyncService();
