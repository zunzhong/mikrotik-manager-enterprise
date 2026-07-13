import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routerOsSdkAdapter } from './routeros-sdk.adapter.js';
import { routerosRoutes } from './routeros.routes.js';

describe('RouterOS SDK routes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers the SDK health endpoint', async () => {
    const app = Fastify();
    await app.register(routerosRoutes);

    const response = await app.inject({ method: 'GET', url: '/api/v1/routeros/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.sdk).toBe('@mme/routeros-sdk');
    await app.close();
  });

  it('forwards TCP, custom port and API-SSL options to the SDK probe', async () => {
    const probe = vi.spyOn(routerOsSdkAdapter, 'probe').mockResolvedValue({
      online: true,
      latencyMs: 5,
      identity: 'router-test',
    });
    const app = Fastify();
    await app.register(routerosRoutes);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/routeros/probe',
      payload: {
        host: '10.0.0.2',
        port: 1890,
        username: 'operator',
        password: 'secret',
        useTls: true,
        rejectUnauthorized: false,
        timeoutMs: 15000,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.identity).toBe('router-test');
    expect(probe).toHaveBeenCalledWith({
      host: '10.0.0.2',
      port: 1890,
      username: 'operator',
      password: 'secret',
      useTls: true,
      rejectUnauthorized: false,
      timeoutMs: 15000,
    });
    await app.close();
  });
});
