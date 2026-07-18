import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { reportService } from './report.service.js';

const paramsSchema = z.object({ id: z.string().min(1) });
const scheduleSchema = z.object({
  name: z.string().trim().min(1).max(100),
  enabled: z.boolean().optional(),
  allDevices: z.boolean().optional(),
  deviceIds: z.array(z.string().min(1)).optional(),
  startAt: z.string().datetime({ offset: true }),
  intervalMinutes: z.number().int().min(5).max(525_600),
  channelMode: z.enum(['existing', 'dedicated']),
  channelId: z.string().optional(),
  telegram: z
    .object({
      botToken: z.string().optional(),
      chatId: z.string().optional(),
    })
    .optional(),
});

export async function reportRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/reports', async () => ({
    success: true,
    data: await reportService.overview(),
  }));

  app.post('/api/v1/reports/schedules', async (request) => ({
    success: true,
    data: reportService.saveSchedule(scheduleSchema.parse(request.body ?? {})),
  }));

  app.put('/api/v1/reports/schedules/:id', async (request) => {
    const params = paramsSchema.parse(request.params);
    return {
      success: true,
      data: reportService.saveSchedule(scheduleSchema.parse(request.body ?? {}), params.id),
    };
  });

  app.delete('/api/v1/reports/schedules/:id', async (request) => {
    const params = paramsSchema.parse(request.params);
    return { success: true, data: reportService.deleteSchedule(params.id) };
  });
}
