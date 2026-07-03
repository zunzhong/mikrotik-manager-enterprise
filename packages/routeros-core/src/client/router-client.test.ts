import { describe, expect, it } from 'vitest';
import { CommandResponse } from '../command/command-response.js';
import { ConnectionState } from '../connection/connection-state.js';
import { RouterOsConnectionError } from '../errors/routeros-error.js';
import { encodeSentence } from '../protocol/encoder.js';
import { FakeTransport } from '../testing/fake-transport.js';
import { RouterClient } from './router-client.js';

describe('RouterClient', () => {
  it('exposes options', () => {
    const client = new RouterClient({
      host: '127.0.0.1',
      port: 8728,
    });

    expect(client.getOptions().host).toBe('127.0.0.1');
    expect(client.getOptions().port).toBe(8728);
  });

  it('connects without authentication when username is not provided', async () => {
    const transport = new FakeTransport();

    const client = new RouterClient({
      host: '127.0.0.1',
      transportFactory: () => transport,
    });

    await client.connect();

    expect(client.state).toBe(ConnectionState.Connected);
    expect(client.isConnected).toBe(true);
    expect(client.isAuthenticated).toBe(false);

    await client.close();

    expect(client.state).toBe(ConnectionState.Closed);
  });

  it('authenticates when username is provided', async () => {
    const transport = new FakeTransport();

    const client = new RouterClient({
      host: '127.0.0.1',
      username: 'admin',
      password: 'secret',
      transportFactory: () => transport,
    });

    const promise = client.connect();

    transport.pushIncoming(encodeSentence(['!done']));

    await promise;

    expect(client.state).toBe(ConnectionState.Authenticated);
    expect(client.isAuthenticated).toBe(true);
  });

  it('executes command after authentication', async () => {
    const transport = new FakeTransport();

    const client = new RouterClient({
      host: '127.0.0.1',
      username: 'admin',
      password: 'secret',
      transportFactory: () => transport,
    });

    const connectPromise = client.connect();
    transport.pushIncoming(encodeSentence(['!done']));
    await connectPromise;

    const commandPromise = client.command('/system/resource/print', {
      '.proplist': 'version,cpu-load',
    });

    transport.pushIncoming(
      Buffer.concat([
        encodeSentence(['!re', '=version=7.15.3', '=cpu-load=4', '.tag=req-1']),
        encodeSentence(['!done', '.tag=req-1']),
      ]),
    );

    const response: CommandResponse = await commandPromise;

    expect(response.rows).toEqual([
      {
        version: '7.15.3',
        'cpu-load': '4',
      },
    ]);
  });

  it('rejects command before authentication', async () => {
    const transport = new FakeTransport();

    const client = new RouterClient({
      host: '127.0.0.1',
      transportFactory: () => transport,
    });

    await client.connect();

    await expect(client.command('/system/resource/print')).rejects.toBeInstanceOf(
      RouterOsConnectionError,
    );
  });
});
