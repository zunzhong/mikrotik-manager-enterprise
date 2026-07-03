import type { FastifyInstance } from 'fastify';
import { dashboardService } from '../application/dashboard.service.js';

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/dashboard/summary', async () => ({
    success: true,
    data: await dashboardService.summary(),
  }));

  app.get('/api/v1/dashboard/devices', async () => ({
    success: true,
    data: await dashboardService.deviceSummary(),
  }));

  app.get('/api/v1/dashboard/alerts', async () => ({
    success: true,
    data: await dashboardService.alertSummary(),
  }));

  app.get('/api/v1/dashboard/compliance', async () => ({
    success: true,
    data: await dashboardService.complianceSummary(),
  }));

  app.get('/api/v1/dashboard/inventory', async () => ({
    success: true,
    data: await dashboardService.inventorySummary(),
  }));

  app.get('/api/v1/dashboard/activity', async () => ({
    success: true,
    data: await dashboardService.activity(),
  }));
}
