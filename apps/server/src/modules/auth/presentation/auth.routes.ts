import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { authGuardService } from '../application/auth-guard.service.js';
import { authService } from '../application/auth.service.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
});

const resetRequestSchema = z.object({
  email: z.string().email(),
});

const resetConfirmSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/v1/auth/login', async (request) => {
    const body = loginSchema.parse(request.body ?? {});

    return {
      success: true,
      data: await authService.login({
        ...body,
        userAgent: request.headers['user-agent'],
        ipAddress: request.ip,
      }),
    };
  });

  app.post('/api/v1/auth/refresh', async (request) => {
    const body = refreshSchema.parse(request.body ?? {});
    return { success: true, data: await authService.refresh(body.refreshToken) };
  });

  app.get('/api/v1/auth/me', { preHandler: authGuardService.requireAuth() }, async (request) => ({
    success: true,
    data: request.user,
  }));

  app.get(
    '/api/v1/auth/sessions',
    { preHandler: authGuardService.requireAuth() },
    async (request) => ({
      success: true,
      data: await authService.sessions(request.user!.id),
    }),
  );

  app.delete(
    '/api/v1/auth/sessions/:id',
    { preHandler: authGuardService.requireAuth() },
    async (request) => {
      const params = request.params as { id: string };
      return { success: true, data: await authService.revokeSession(request.user!.id, params.id) };
    },
  );

  app.post(
    '/api/v1/auth/logout-all',
    { preHandler: authGuardService.requireAuth() },
    async (request) => ({
      success: true,
      data: await authService.logoutAll(request.user!.id),
    }),
  );

  app.post(
    '/api/v1/auth/change-password',
    { preHandler: authGuardService.requireAuth() },
    async (request) => {
      const body = changePasswordSchema.parse(request.body ?? {});
      return {
        success: true,
        data: await authService.changePassword(
          request.user!.id,
          body.currentPassword,
          body.newPassword,
        ),
      };
    },
  );

  app.post('/api/v1/auth/password-reset/request', async (request) => {
    const body = resetRequestSchema.parse(request.body ?? {});
    return { success: true, data: await authService.requestPasswordReset(body.email) };
  });

  app.post('/api/v1/auth/password-reset/confirm', async (request) => {
    const body = resetConfirmSchema.parse(request.body ?? {});
    return {
      success: true,
      data: await authService.confirmPasswordReset(body.token, body.newPassword),
    };
  });

  app.post('/api/v1/auth/logout', async () => ({
    success: true,
    data: authService.logout(),
  }));
}
