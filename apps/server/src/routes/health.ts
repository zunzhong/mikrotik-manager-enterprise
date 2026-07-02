import type { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => {
    return {
      status: 'ok',
      name: env.APP_NAME,
      version: env.APP_VERSION,
      node: process.version,
      uptime: Number(process.uptime().toFixed(2))
    };
  });

  app.get('/api/v1/health', async () => {
    return {
      success: true,
      data: {
        status: 'ok',
        name: env.APP_NAME,
        version: env.APP_VERSION,
        node: process.version,
        uptime: Number(process.uptime().toFixed(2))
      }
    };
  });
}