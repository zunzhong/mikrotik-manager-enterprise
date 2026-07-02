import type { FastifyInstance } from 'fastify';
import { config } from '../config/config.service.js';

function getHealthPayload() {
  return {
    status: 'ok',
    name: config.app.name,
    version: config.app.version,
    environment: config.app.environment,
    node: process.version,
    uptime: Number(process.uptime().toFixed(2)),
  };
}

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => {
    return getHealthPayload();
  });

  app.get('/api/v1/health', async () => {
    return {
      success: true,
      data: getHealthPayload(),
    };
  });
}
