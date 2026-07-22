import { existsSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';

export async function registerWebApp(app: FastifyInstance): Promise<void> {
  const root = resolve(process.env.WEB_DIST_PATH ?? resolve(process.cwd(), 'apps/web/dist'));

  if (!existsSync(resolve(root, 'index.html'))) {
    app.log.info({ root }, 'Web build was not found; API-only mode is active');
    app.setNotFoundHandler((request, reply) =>
      reply.status(404).send({
        success: false,
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: `Route ${request.method} ${request.url} not found`,
        },
      }),
    );
    return;
  }

  await app.register(fastifyStatic, {
    root,
    prefix: '/',
    // index.html must always be transferred after an in-place upgrade. Weak
    // mtime/size validators can otherwise reuse stale HTML that references an
    // asset hash removed by the new package.
    cacheControl: false,
    etag: false,
    lastModified: false,
    setHeaders(response, filePath) {
      if (filePath.endsWith(`${sep}index.html`)) {
        response.setHeader('cache-control', 'no-store, max-age=0');
      } else if (filePath.includes(`${sep}assets${sep}`)) {
        response.setHeader('cache-control', 'public, max-age=31536000, immutable');
      } else {
        response.setHeader('cache-control', 'no-cache');
      }
    },
  });

  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api/') || request.url === '/health' || request.url === '/ready') {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: `Route ${request.method} ${request.url} not found`,
        },
      });
    }

    // Do not disguise missing CSS/JS/images as the SPA document.
    if (request.url.startsWith('/assets/') || extname(request.url.split('?', 1)[0] ?? '') !== '') {
      return reply.status(404).send({
        success: false,
        error: { code: 'STATIC_ASSET_NOT_FOUND', message: `Asset ${request.url} not found` },
      });
    }

    return reply
      .header('cache-control', 'no-store, max-age=0')
      .type('text/html')
      .sendFile('index.html', { cacheControl: false, etag: false, lastModified: false });
  });
}
