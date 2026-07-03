import { afterEach, describe, expect, it } from 'vitest';
import { RouterOsAuthError, RouterOsCommandError } from '../errors/routeros-error.js';
import { FakeRouterOsServer } from '../testing/fake-routeros-server.js';
import { RouterClient } from './router-client.js';

describe('RouterClient integration with FakeRouterOsServer', () => {
  let server: FakeRouterOsServer | null = null;

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = null;
    }
  });

  it('authenticates over real TCP with modern login', async () => {
    server = new FakeRouterOsServer({
      username: 'admin',
      password: 'secret',
    });

    await server.start();

    const client = new RouterClient({
      host: '127.0.0.1',
      port: server.port,
      username: 'admin',
      password: 'secret',
      timeoutMs: 1000,
    });

    await client.connect();

    expect(client.isAuthenticated).toBe(true);

    await client.close();
  });

  it('authenticates over real TCP with legacy challenge login', async () => {
    server = new FakeRouterOsServer({
      username: 'admin',
      password: 'secret',
      loginMode: 'legacy',
    });

    await server.start();

    const client = new RouterClient({
      host: '127.0.0.1',
      port: server.port,
      username: 'admin',
      password: 'secret',
      loginMode: 'legacy',
      timeoutMs: 1000,
    });

    await client.connect();

    expect(client.isAuthenticated).toBe(true);

    await client.close();
  });

  it('runs /system/resource/print over real TCP', async () => {
    server = new FakeRouterOsServer({
      username: 'admin',
      password: 'secret',
    });

    await server.start();

    const client = new RouterClient({
      host: '127.0.0.1',
      port: server.port,
      username: 'admin',
      password: 'secret',
      timeoutMs: 1000,
    });

    await client.connect();

    const response = await client.command('/system/resource/print', {
      '.proplist': 'version,uptime,cpu-load',
    });

    expect(response.rows[0].version).toBe('7.15.3');
    expect(response.rows[0].uptime).toBe('1d2h3m');
    expect(response.rows[0]['cpu-load']).toBe('4');

    await client.close();
  });

  it('rejects invalid authentication', async () => {
    server = new FakeRouterOsServer({
      username: 'admin',
      password: 'secret',
    });

    await server.start();

    const client = new RouterClient({
      host: '127.0.0.1',
      port: server.port,
      username: 'admin',
      password: 'wrong',
      timeoutMs: 1000,
    });

    await expect(client.connect()).rejects.toBeInstanceOf(RouterOsAuthError);
  });

  it('returns trap for unknown command', async () => {
    server = new FakeRouterOsServer({
      username: 'admin',
      password: 'secret',
    });

    await server.start();

    const client = new RouterClient({
      host: '127.0.0.1',
      port: server.port,
      username: 'admin',
      password: 'secret',
      timeoutMs: 1000,
    });

    await client.connect();

    await expect(client.command('/bad/command')).rejects.toBeInstanceOf(RouterOsCommandError);

    await client.close();
  });
});
