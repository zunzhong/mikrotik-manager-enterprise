import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { backupService } from '../application/backup.service.js';

const createBackupSchema = z.object({
  type: z.enum(['binary', 'export']).default('export'),
});

const backupScheduleSchema = z.object({
  enabled: z.boolean(),
  type: z.enum(['binary', 'export']).default('export'),
  intervalHours: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 365),
  scheduledTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

export async function backupRoutes(app: FastifyInstance) {
  app.get('/api/v1/devices/:id/backups', async (request) => {
    const params = request.params as { id: string };

    return {
      success: true,
      data: await backupService.list(params.id),
    };
  });

  app.post('/api/v1/devices/:id/backup', async (request, reply) => {
    const params = request.params as { id: string };
    const body = createBackupSchema.parse(request.body ?? {});

    return reply.code(202).send({
      success: true,
      data: await backupService.create(params.id, body.type),
    });
  });

  app.get('/api/v1/backups/:id', async (request) => {
    const params = request.params as { id: string };

    return {
      success: true,
      data: await backupService.get(params.id),
    };
  });

  app.get('/api/v1/backups/:id/download', async (request, reply) => {
    const params = request.params as { id: string };
    const { backup, content } = await backupService.readFile(params.id);
    return reply
      .header('Content-Disposition', `attachment; filename="${backup.fileName}"`)
      .type('application/octet-stream')
      .send(content);
  });

  app.get('/api/v1/backups/:id/content', async (request) => {
    const params = request.params as { id: string };
    const { backup, content } = await backupService.readFile(params.id, true);
    return {
      success: true,
      data: { id: backup.id, fileName: backup.fileName, content: content.toString('utf8') },
    };
  });

  app.get('/api/v1/backup/schedules', async () => ({
    success: true,
    data: await backupService.listSchedules(),
  }));

  app.put('/api/v1/devices/:id/backup/schedule', async (request) => {
    const params = request.params as { id: string };
    const body = backupScheduleSchema.parse(request.body ?? {});
    return { success: true, data: await backupService.configureSchedule(params.id, body) };
  });

  app.delete('/api/v1/backup/schedules/:id', async (request) => {
    const params = request.params as { id: string };
    return { success: true, data: await backupService.deleteSchedule(params.id) };
  });

  app.post('/api/v1/backups/:id/validate', async (request) => {
    const params = request.params as { id: string };

    return {
      success: true,
      data: await backupService.validate(params.id),
    };
  });

  app.get('/api/v1/devices/:id/snapshots', async (request) => {
    const params = request.params as { id: string };

    return {
      success: true,
      data: await backupService.list(params.id),
    };
  });

  app.delete('/api/v1/backups/:id', async (request) => {
    const params = request.params as { id: string };

    return {
      success: true,
      data: await backupService.delete(params.id),
    };
  });
}
