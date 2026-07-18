import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { reportRoutes } from './report.routes.js';

describe('report routes', () => {
  it('does not expose an unscheduled send-now endpoint', async () => {
    const app = Fastify();
    await app.register(reportRoutes);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reports/schedules/report-1/send',
      payload: {},
    });

    expect(response.statusCode).toBe(404);
    await app.close();
  });
});
