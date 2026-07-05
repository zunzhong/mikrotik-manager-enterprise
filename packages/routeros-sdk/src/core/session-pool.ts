import { RouterOsClient } from '../client/routeros-client.js';
import type {
  RouterOsPoolExecutionResult,
  RouterOsPoolHealth,
  RouterOsPoolTarget,
  RouterOsRetryPolicy,
} from '../models/session-pool.js';
import { retry } from './retry.js';

function now(): string {
  return new Date().toISOString();
}

function duration(startedAt: string, finishedAt: string): number {
  return new Date(finishedAt).getTime() - new Date(startedAt).getTime();
}

export class RouterOsSessionPool {
  private readonly clients = new Map<string, RouterOsClient>();

  public constructor(
    private readonly targets: RouterOsPoolTarget[],
    private readonly retryPolicy: RouterOsRetryPolicy = {},
  ) {}

  public listTargets(): RouterOsPoolTarget[] {
    return [...this.targets].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
  }

  public getClient(targetId: string): RouterOsClient {
    const target = this.targets.find((item) => item.id === targetId);
    if (!target) throw new Error(`RouterOS pool target not found: ${targetId}`);

    const existing = this.clients.get(targetId);
    if (existing) return existing;

    const client = new RouterOsClient(target.options);
    this.clients.set(targetId, client);
    return client;
  }

  public async connect(targetId: string): Promise<RouterOsClient> {
    const client = this.getClient(targetId);
    await retry(() => client.connect(), this.retryPolicy);
    return client;
  }

  public async disconnectAll(): Promise<void> {
    for (const client of this.clients.values()) {
      client.close();
    }
    this.clients.clear();
  }

  public async healthCheck(target: RouterOsPoolTarget): Promise<RouterOsPoolHealth> {
    const startedAt = Date.now();
    const checkedAt = now();

    try {
      const client = new RouterOsClient(target.options);
      await retry(() => client.connect(), this.retryPolicy);
      await client.system.identity();
      client.close();

      return {
        targetId: target.id,
        name: target.name,
        online: true,
        latencyMs: Date.now() - startedAt,
        checkedAt,
      };
    } catch (error) {
      return {
        targetId: target.id,
        name: target.name,
        online: false,
        latencyMs: Date.now() - startedAt,
        checkedAt,
        error: error instanceof Error ? error.message : 'RouterOS target health check failed',
      };
    }
  }

  public async healthCheckAll(): Promise<RouterOsPoolHealth[]> {
    const enabledTargets = this.listTargets().filter((target) => target.enabled !== false);
    return Promise.all(enabledTargets.map((target) => this.healthCheck(target)));
  }

  public async executeOnTarget<T>(
    targetId: string,
    fn: (client: RouterOsClient) => Promise<T>,
  ): Promise<RouterOsPoolExecutionResult<T>> {
    const target = this.targets.find((item) => item.id === targetId);
    if (!target) throw new Error(`RouterOS pool target not found: ${targetId}`);

    const startedAt = now();

    try {
      const client = await this.connect(targetId);
      const data = await retry(() => fn(client), this.retryPolicy);
      const finishedAt = now();

      return {
        targetId: target.id,
        targetName: target.name,
        success: true,
        startedAt,
        finishedAt,
        durationMs: duration(startedAt, finishedAt),
        data,
      };
    } catch (error) {
      const finishedAt = now();

      return {
        targetId: target.id,
        targetName: target.name,
        success: false,
        startedAt,
        finishedAt,
        durationMs: duration(startedAt, finishedAt),
        error: error instanceof Error ? error.message : 'RouterOS pool execution failed',
      };
    }
  }

  public async executeOnAll<T>(
    fn: (client: RouterOsClient, target: RouterOsPoolTarget) => Promise<T>,
  ): Promise<Array<RouterOsPoolExecutionResult<T>>> {
    const enabledTargets = this.listTargets().filter((target) => target.enabled !== false);

    return Promise.all(
      enabledTargets.map((target) =>
        this.executeOnTarget(target.id, (client) => fn(client, target)),
      ),
    );
  }

  public async executeOnFirstHealthy<T>(
    fn: (client: RouterOsClient, target: RouterOsPoolTarget) => Promise<T>,
  ): Promise<RouterOsPoolExecutionResult<T>> {
    const enabledTargets = this.listTargets().filter((target) => target.enabled !== false);

    for (const target of enabledTargets) {
      const result = await this.executeOnTarget(target.id, (client) => fn(client, target));
      if (result.success) return result;
    }

    throw new Error('No healthy RouterOS pool target succeeded');
  }
}
