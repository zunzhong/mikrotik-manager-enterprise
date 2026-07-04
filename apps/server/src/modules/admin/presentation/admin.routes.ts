import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { authGuardService } from '../../auth/index.js';
import { adminService } from '../application/admin.service.js';

const assignRoleSchema = z.object({ roleId: z.string().min(1) });
const assignPermissionSchema = z.object({ permissionId: z.string().min(1) });

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  const adminOnly = authGuardService.requireRole(['admin']);

  app.get('/api/v1/admin/users', { preHandler: adminOnly }, async () => ({
    success: true,
    data: await adminService.users(),
  }));

  app.get('/api/v1/admin/roles', { preHandler: adminOnly }, async () => ({
    success: true,
    data: await adminService.roles(),
  }));

  app.get('/api/v1/admin/permissions', { preHandler: adminOnly }, async () => ({
    success: true,
    data: await adminService.permissions(),
  }));

  app.post('/api/v1/admin/users/:id/roles', { preHandler: adminOnly }, async (request) => {
    const params = request.params as { id: string };
    const body = assignRoleSchema.parse(request.body ?? {});

    return {
      success: true,
      data: await adminService.assignUserRole(params.id, body.roleId),
    };
  });

  app.post('/api/v1/admin/roles/:id/permissions', { preHandler: adminOnly }, async (request) => {
    const params = request.params as { id: string };
    const body = assignPermissionSchema.parse(request.body ?? {});

    return {
      success: true,
      data: await adminService.assignRolePermission(params.id, body.permissionId),
    };
  });
}
