import { describe, expect, it } from 'vitest';
import { RouterClient } from '../client/router-client.js';
import { FakeRouterOsServer } from './fake-routeros-server.js';

describe('FakeRouterOsServer', () => {
  it('starts and stops', async () => {
    const server = new FakeRouterOsServer();

    await server.start();

    expect(server.port).toBeGreaterThan(0);

    await server.stop();
  });

  it('supports stateful command handlers for installer smoke tests', async () => {
    const rows: Array<Record<string, string>> = [];
    const server = new FakeRouterOsServer({
      username: 'admin',
      password: 'secret',
      commandHandler: (sentence) => {
        if (sentence[0] === '/test/add') {
          rows.push({ '.id': '*1', name: 'created' });
          return [];
        }
        if (sentence[0] === '/test/print') return rows;
        return undefined;
      },
    });
    await server.start();
    const client = new RouterClient({
      host: '127.0.0.1',
      port: server.port,
      username: 'admin',
      password: 'secret',
    });

    try {
      await client.connect();
      await client.command('/test/add');
      const response = await client.command('/test/print');
      expect(response.rows).toEqual([{ '.id': '*1', name: 'created' }]);
    } finally {
      await client.close();
      await server.stop();
    }
  });
});
