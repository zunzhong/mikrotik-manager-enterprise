import { createServer } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { ConnectionState } from '../connection/connection-state.js';
import { RouterClient } from './router-client.js';

function createTcpTestServer(): Promise<{ port: number; close: () => Promise<void> }> {
  const server = createServer((socket) => {
    socket.on('error', () => undefined);
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();

      if (!address || typeof address === 'string') {
        reject(new Error('Invalid test server address'));
        return;
      }

      resolve({
        port: address.port,
        close: () =>
          new Promise<void>((closeResolve) => {
            server.close(() => closeResolve());
          }),
      });
    });
  });
}

describe('RouterClient', () => {
  let cleanup: (() => Promise<void>) | null = null;

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
      cleanup = null;
    }
  });

  it('exposes options', () => {
    const client = new RouterClient({
      host: '127.0.0.1',
      port: 8728,
    });

    expect(client.getOptions().host).toBe('127.0.0.1');
    expect(client.getOptions().port).toBe(8728);
  });

  it('connects and closes', async () => {
    const server = await createTcpTestServer();
    cleanup = server.close;

    const client = new RouterClient({
      host: '127.0.0.1',
      port: server.port,
      timeoutMs: 1000,
    });

    await client.connect();

    expect(client.state).toBe(ConnectionState.Connected);
    expect(client.isConnected).toBe(true);

    await client.close();

    expect(client.state).toBe(ConnectionState.Closed);
  });
});
