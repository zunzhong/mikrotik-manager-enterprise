import { RouterOsClient, type RouterOsClientOptions } from './routeros-client.js';

export interface RouterOsProbeResult {
  online: boolean;
  latencyMs: number;
  identity?: string;
  version?: string;
  architecture?: string;
  boardName?: string;
  serialNumber?: string;
  uptime?: string;
  error?: string;
  raw?: Record<string, unknown>;
}

function value(...items: unknown[]): string | undefined {
  for (const item of items) if (typeof item === 'string' && item.length > 0) return item;
  return undefined;
}

export async function probeRouterOs(options: RouterOsClientOptions): Promise<RouterOsProbeResult> {
  const startedAt = Date.now();
  const client = new RouterOsClient(options);

  try {
    await client.connect();
    const identity = await client.system.identity();
    const resource = await client.system.resource();
    const routerboard = await client.system.routerboard();

    return {
      online: true,
      latencyMs: Date.now() - startedAt,
      identity: value(identity.name),
      version: value(resource.version),
      architecture: value(resource.architectureName, resource.architecture),
      boardName: value(routerboard.model, resource.boardName),
      serialNumber: value(routerboard.serialNumber),
      uptime: value(resource.uptime),
      raw: { identity, resource, routerboard },
    };
  } catch (error) {
    return {
      online: false,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : 'RouterOS probe failed',
    };
  } finally {
    client.close();
  }
}
