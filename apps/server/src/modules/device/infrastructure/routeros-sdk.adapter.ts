import { RouterClient } from '@mme/routeros-core';
import type { RouterOsConnectionInput } from '../domain/routeros-connection.types.js';

type RouterClientLike = {
  connect?: () => Promise<void>;
  close?: () => Promise<void>;
  command?: (path: string, params?: Record<string, unknown>) => Promise<unknown>;
  execute?: (path: string, params?: Record<string, unknown>) => Promise<unknown>;
  query?: (path: string, params?: Record<string, unknown>) => Promise<unknown>;
};

export class RouterOsSdkAdapter {
  public createClient(input: RouterOsConnectionInput): RouterClientLike {
    return new RouterClient({
      host: input.host,
      port: input.port ?? (input.useTls ? 8729 : 8728),
      username: input.username,
      password: input.password,
      tls: input.useTls ?? false,
      timeoutMs: input.timeoutMs ?? 10000,
    } as never) as RouterClientLike;
  }

  public async connect(client: RouterClientLike): Promise<void> {
    if (typeof client.connect === 'function') {
      await client.connect();
    }
  }

  public async close(client: RouterClientLike): Promise<void> {
    if (typeof client.close === 'function') {
      await client.close();
    }
  }

  public async run(
    client: RouterClientLike,
    path: string,
    params?: Record<string, unknown>,
  ): Promise<unknown> {
    if (typeof client.command === 'function') return client.command(path, params);
    if (typeof client.execute === 'function') return client.execute(path, params);
    if (typeof client.query === 'function') return client.query(path, params);

    throw new Error('RouterOS SDK client does not expose command/execute/query method');
  }
}

export const routerOsSdkAdapter = new RouterOsSdkAdapter();
