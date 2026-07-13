import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
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

  await app.register(fastifyStatic, { root, prefix: '/' });

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

    return reply.type('text/html').sendFile('index.html');
  });
}
