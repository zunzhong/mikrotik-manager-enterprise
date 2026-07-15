import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { attachAuthContextPreHandler } from '../../auth/auth.context.middleware.js';
import { rbacGuard } from '../../rbac/rbac.guard.js';
import { systemPreferencesService } from '../application/system-preferences.service.js';
import { systemStatusService } from '../application/system-status.service.js';

const updatePreferencesSchema = z
  .object({
    timeZone: z.string().min(1).max(100).optional(),
    language: z.enum(['vi', 'en']).optional(),
  })
  .refine((value) => value.timeZone !== undefined || value.language !== undefined, {
    message: 'Cần ít nhất một thiết lập để cập nhật.',
  });

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

  app.get('/api/v1/system/preferences', async () => ({
    success: true,
    data: systemPreferencesService.get(),
  }));

  app.patch(
    '/api/v1/system/preferences',
    { preHandler: [attachAuthContextPreHandler, rbacGuard('system:manage')] },
    async (request) => ({
      success: true,
      data: systemPreferencesService.update(updatePreferencesSchema.parse(request.body ?? {})),
    }),
  );
}
