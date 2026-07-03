import { describe, expect, it } from 'vitest';
import { FakeRouterOsServer } from './fake-routeros-server.js';

describe('FakeRouterOsServer', () => {
  it('starts and stops', async () => {
    const server = new FakeRouterOsServer();

    await server.start();

    expect(server.port).toBeGreaterThan(0);

    await server.stop();
  });
});
