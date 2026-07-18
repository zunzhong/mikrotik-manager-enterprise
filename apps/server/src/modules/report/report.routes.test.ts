import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { reportRoutes } from './report.routes.js';
import { reportService } from './report.service.js';

afterEach(() => vi.restoreAllMocks());

describe('report routes', () => {
  it('sends a saved schedule through the explicit send-now endpoint', async () => {
    const send = vi.spyOn(reportService, 'sendScheduleNow').mockResolvedValue([]);
    const app = Fastify();
    await app.register(reportRoutes);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reports/schedules/report-1/send',
      payload: {},
    });

    expect(response.statusCode).toBe(200);
    expect(send).toHaveBeenCalledWith('report-1');
    await app.close();
  });
});
