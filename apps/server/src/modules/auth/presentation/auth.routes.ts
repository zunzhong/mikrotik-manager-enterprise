import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { authGuardService } from '../application/auth-guard.service.js';
import { authService } from '../application/auth.service.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/v1/auth/login', async (request) => {
    const body = loginSchema.parse(request.body ?? {});

    return {
      success: true,
      data: await authService.login(body.email, body.password),
    };
  });

  app.get(
    '/api/v1/auth/me',
    {
      preHandler: authGuardService.requireAuth(),
    },
    async (request) => ({
      success: true,
      data: request.user,
    }),
  );

  app.get(
    '/api/v1/auth/admin-check',
    {
      preHandler: authGuardService.requireRole(['admin']),
    },
    async (request) => ({
      success: true,
      data: {
        ok: true,
        user: request.user,
        message: 'Admin permission confirmed',
      },
    }),
  );

  app.post('/api/v1/auth/logout', async () => ({
    success: true,
    data: authService.logout(),
  }));
}
