import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { backupService } from '../application/backup.service.js';

const createBackupSchema = z.object({
  type: z.enum(['binary', 'export']).default('export'),
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
    const backup = await backupService.get(params.id);

    return reply.code(202).send({
      success: true,
      data: {
        backupId: backup.id,
        fileName: backup.fileName,
        available: backup.storage.exists,
        note: 'Physical file transfer from RouterOS storage is not enabled yet.',
      },
    });
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
