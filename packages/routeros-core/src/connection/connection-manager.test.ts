import { createServer } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { ConnectionManager } from './connection-manager.js';
import { ConnectionState } from './connection-state.js';

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

describe('ConnectionManager', () => {
  let cleanup: (() => Promise<void>) | null = null;

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
      cleanup = null;
    }
  });

  it('connects and closes', async () => {
    const server = await createTcpTestServer();
    cleanup = server.close;

    const manager = new ConnectionManager({
      host: '127.0.0.1',
      port: server.port,
      timeoutMs: 1000,
    });

    await manager.connect();

    expect(manager.state).toBe(ConnectionState.Connected);
    expect(manager.isConnected).toBe(true);

    await manager.close();

    expect(manager.state).toBe(ConnectionState.Closed);
  });

  it('emits state changes', async () => {
    const server = await createTcpTestServer();
    cleanup = server.close;

    const manager = new ConnectionManager({
      host: '127.0.0.1',
      port: server.port,
      timeoutMs: 1000,
    });

    const states: ConnectionState[] = [];
    manager.on('state', (state: ConnectionState) => states.push(state));

    await manager.connect();
    await manager.close();

    expect(states).toContain(ConnectionState.Connecting);
    expect(states).toContain(ConnectionState.Connected);
    expect(states).toContain(ConnectionState.Closing);
    expect(states).toContain(ConnectionState.Closed);
  });
});
