import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ALL_RBAC_PERMISSIONS } from './rbac.permissions.js';
import { rbacService } from './rbac.service.js';
import type { RbacPermission, RbacPrincipal } from './rbac.types.js';

const userParamsSchema = z.object({
  userId: z.string().min(1),
});

const roleParamsSchema = z.object({
  id: z.string().min(1),
});

const userRoleParamsSchema = z.object({
  userId: z.string().min(1),
  roleId: z.string().min(1),
});

const assignRoleSchema = z.object({
  roleId: z.string().min(1),
  assignedBy: z.string().optional(),
});

const principalSchema = z.object({
  userId: z.string().optional(),
  roleIds: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  isSuperAdmin: z.boolean().optional(),
});

const checkPermissionSchema = z.object({
  principal: principalSchema,
  permission: z.string().min(1),
});

export async function rbacRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/rbac/permissions', async () => ({
    success: true,
    data: ALL_RBAC_PERMISSIONS,
  }));

  app.get('/api/v1/rbac/roles', async () => ({
    success: true,
    data: rbacService.listRoles(),
  }));

  app.get('/api/v1/rbac/roles/:id', async (request, reply) => {
    const params = roleParamsSchema.parse(request.params);
    const role = rbacService.getRole(params.id);

    if (!role) {
      reply.code(404);
      return {
        success: false,
        error: 'RBAC role not found',
      };
    }

    return {
      success: true,
      data: role,
    };
  });

  app.get('/api/v1/rbac/users/:userId/permissions', async (request) => {
    const params = userParamsSchema.parse(request.params);

    return {
      success: true,
      data: rbacService.getUserPermissions(params.userId),
    };
  });

  app.get('/api/v1/rbac/users/:userId/roles', async (request) => {
    const params = userParamsSchema.parse(request.params);

    return {
      success: true,
      data: rbacService.listUserRoleAssignments(params.userId),
    };
  });

  app.post('/api/v1/rbac/users/:userId/roles', async (request, reply) => {
    const params = userParamsSchema.parse(request.params);
    const body = assignRoleSchema.parse(request.body ?? {});
    const role = rbacService.getRole(body.roleId);

    if (!role) {
      reply.code(404);
      return {
        success: false,
        error: 'RBAC role not found',
      };
    }

    return {
      success: true,
      data: rbacService.assignUserRole({
        userId: params.userId,
        roleId: body.roleId,
        assignedBy: body.assignedBy,
      }),
    };
  });

  app.delete('/api/v1/rbac/users/:userId/roles/:roleId', async (request, reply) => {
    const params = userRoleParamsSchema.parse(request.params);
    const removed = rbacService.removeUserRole(params.userId, params.roleId);

    if (!removed) {
      reply.code(404);
      return {
        success: false,
        error: 'RBAC role assignment not found',
      };
    }

    return {
      success: true,
      data: {
        userId: params.userId,
        roleId: params.roleId,
        removed,
      },
    };
  });

  app.post('/api/v1/rbac/check', async (request) => {
    const body = checkPermissionSchema.parse(request.body ?? {});
    const principal: RbacPrincipal = {
      ...body.principal,
      permissions: body.principal.permissions as RbacPermission[] | undefined,
    };

    return {
      success: true,
      data: rbacService.checkPermission({
        principal,
        permission: body.permission as RbacPermission,
      }),
    };
  });
}
