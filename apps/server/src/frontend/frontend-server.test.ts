import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { startFrontendServer } from './frontend-server.js';

const servers: Server[] = [];
const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
  );
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server has no TCP address.');
  return address.port;
}

describe('separate frontend listener', () => {
  it('serves the SPA and proxies API traffic to the selected backend port', async () => {
    const backendPort = await listen(
      createServer((request, response) => {
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ method: request.method, url: request.url }));
      }),
    );
    const webRoot = mkdtempSync(join(tmpdir(), 'mme-frontend-'));
    directories.push(webRoot);
    writeFileSync(join(webRoot, 'index.html'), '<main>MME SPA</main>');

    const frontend = await startFrontendServer({
      backendHost: '127.0.0.1',
      backendPort,
      frontendHost: '127.0.0.1',
      frontendPort: 0,
      webRoot,
    });
    servers.push(frontend);
    const address = frontend.address();
    if (!address || typeof address === 'string') throw new Error('Frontend has no TCP address.');

    const api = await fetch(`http://127.0.0.1:${address.port}/api/v1/devices?limit=1`);
    await expect(api.json()).resolves.toEqual({
      method: 'GET',
      url: '/api/v1/devices?limit=1',
    });

    const spa = await fetch(`http://127.0.0.1:${address.port}/topology`);
    expect(await spa.text()).toContain('MME SPA');
    expect(spa.headers.get('x-content-type-options')).toBe('nosniff');
  });
});
