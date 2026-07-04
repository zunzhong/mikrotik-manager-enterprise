import type { FastifyInstance } from 'fastify';
import { systemStatusService } from '../application/system-status.service.js';

export async function systemRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/system/live', async () => ({
    success: true,
    data: systemStatusService.live(),
  }));

  app.get('/api/v1/system/ready', async () => ({
    success: true,
    data: await systemStatusService.ready(),
  }));

  app.get('/api/v1/system/version', async () => ({
    success: true,
    data: systemStatusService.version(),
  }));

  app.get('/api/v1/system/status', async () => ({
    success: true,
    data: await systemStatusService.status(),
  }));
}
