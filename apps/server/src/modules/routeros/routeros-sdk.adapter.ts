import { RouterOsClient } from '@mme/routeros-sdk';
import { z } from 'zod';

export const routerOsProbeInputSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive().optional(),
  username: z.string().min(1),
  password: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
  tls: z.boolean().optional(),
  useTls: z.boolean().optional(),
  rejectUnauthorized: z.boolean().optional(),
});

export type RouterOsProbeInput = z.input<typeof routerOsProbeInputSchema>;

interface NormalizedRouterOsProbeInput {
  host: string;
  port: number;
  username: string;
  password: string;
  timeoutMs: number;
  tls: boolean;
  rejectUnauthorized: boolean;
}

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
  raw?: { identity?: unknown; resource?: unknown; routerboard?: unknown };
}

export interface RouterOsInventorySnapshot {
  collectedAt: string;
  identity: object;
  resource: object;
  routerboard: object;
  health: object[];
  services: object[];
}

function normalizeInput(input: RouterOsProbeInput): NormalizedRouterOsProbeInput {
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

function value(...items: unknown[]): string | undefined {
  for (const item of items) if (typeof item === 'string' && item.length > 0) return item;
  return undefined;
}

export class RouterOsSdkAdapter {
  public async probe(input: RouterOsProbeInput): Promise<RouterOsProbeResult> {
    const normalized = normalizeInput(input);
    const startedAt = Date.now();
    const client = new RouterOsClient(normalized);
    try {
      await client.connect();
      const [identity, resource, routerboard] = await Promise.all([
        client.system.identity(),
        client.system.resource(),
        client.system.routerboard(),
      ]);
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

  public async identity(input: RouterOsProbeInput): Promise<object> {
    const client = new RouterOsClient(normalizeInput(input));
    try {
      await client.connect();
      return { ...(await client.system.identity()) };
    } finally {
      client.close();
    }
  }

  public async resource(input: RouterOsProbeInput): Promise<object> {
    const client = new RouterOsClient(normalizeInput(input));
    try {
      await client.connect();
      return { ...(await client.system.resource()) };
    } finally {
      client.close();
    }
  }

  public async routerboard(input: RouterOsProbeInput): Promise<object> {
    const client = new RouterOsClient(normalizeInput(input));
    try {
      await client.connect();
      return { ...(await client.system.routerboard()) };
    } finally {
      client.close();
    }
  }

  public async inventory(input: RouterOsProbeInput): Promise<RouterOsInventorySnapshot> {
    const client = new RouterOsClient(normalizeInput(input));
    try {
      await client.connect();
      const [identity, resource, routerboard, health, services] = await Promise.all([
        client.system.identity(),
        client.system.resource(),
        client.system.routerboard(),
        client.print('/system/health/print').catch(() => []),
        client.print('/ip/service/print').catch(() => []),
      ]);
      return {
        collectedAt: new Date().toISOString(),
        identity: { ...identity },
        resource: { ...resource },
        routerboard: { ...routerboard },
        health,
        services,
      };
    } finally {
      client.close();
    }
  }
}

export const routerOsSdkAdapter = new RouterOsSdkAdapter();
