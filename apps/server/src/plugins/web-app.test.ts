import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import helmet from '@fastify/helmet';
import Fastify from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { createSecurityHeaderOptions } from './security-headers.js';
import { registerWebApp } from './web-app.js';

const directories: string[] = [];
const originalWebDistPath = process.env.WEB_DIST_PATH;

afterEach(() => {
  if (originalWebDistPath === undefined) delete process.env.WEB_DIST_PATH;
  else process.env.WEB_DIST_PATH = originalWebDistPath;
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe('combined backend/frontend static delivery', () => {
  it('always transfers current HTML and serves real browser assets with correct MIME types', async () => {
    const webRoot = mkdtempSync(join(tmpdir(), 'mme-fastify-web-'));
    directories.push(webRoot);
    mkdirSync(join(webRoot, 'assets'));
    writeFileSync(
      join(webRoot, 'index.html'),
      '<div id="root"></div><script type="module" src="/assets/app.js"></script>',
    );
    writeFileSync(join(webRoot, 'assets/app.js'), 'document.title = "MME";');
    process.env.WEB_DIST_PATH = webRoot;

    const app = Fastify();
    await app.register(helmet, createSecurityHeaderOptions());
    await registerWebApp(app);

    const html = await app.inject({
      method: 'GET',
      url: '/',
      headers: {
        'if-none-match': 'W/"stale-upgrade-validator"',
        'if-modified-since': 'Wed, 21 Oct 2015 07:28:00 GMT',
      },
    });
    expect(html.statusCode).toBe(200);
    expect(html.headers['cache-control']).toBe('no-store, max-age=0');
    expect(html.headers.etag).toBeUndefined();
    expect(html.headers['content-security-policy']).not.toContain('upgrade-insecure-requests');
    expect(html.headers['cross-origin-opener-policy']).toBeUndefined();
    expect(html.headers['origin-agent-cluster']).toBeUndefined();
    expect(html.body).toContain('<div id="root"></div>');

    const script = await app.inject({ method: 'GET', url: '/assets/app.js' });
    expect(script.statusCode).toBe(200);
    expect(script.headers['content-type']).toContain('javascript');
    expect(script.headers['cache-control']).toContain('immutable');
    expect(script.body).toContain('document.title');

    const missing = await app.inject({ method: 'GET', url: '/assets/old-hash.js' });
    expect(missing.statusCode).toBe(404);
    expect(missing.headers['content-type']).toContain('application/json');
    expect(missing.body).not.toContain('<div id="root"></div>');

    await app.close();
  });
});
