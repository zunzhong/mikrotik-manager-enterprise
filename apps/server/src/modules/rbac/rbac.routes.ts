import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { auditService } from '../audit/index.js';
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

function apiActor(id?: string) {
  return {
    type: 'api' as const,
    id: id ?? 'rbac-api',
    name: id ?? 'RBAC API',
  };
}

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
      await auditService.logFailure({
        action: 'rbac.user_role.assign_failed',
        summary: `Failed to assign missing RBAC role ${body.roleId} to user ${params.userId}`,
        actor: apiActor(body.assignedBy),
        entity: {
          type: 'auth',
          id: params.userId,
          name: params.userId,
        },
        severity: 'warning',
        metadata: {
          userId: params.userId,
          roleId: body.roleId,
          reason: 'role_not_found',
        },
      });

      reply.code(404);
      return {
        success: false,
        error: 'RBAC role not found',
      };
    }

    const assignment = rbacService.assignUserRole({
      userId: params.userId,
      roleId: body.roleId,
      assignedBy: body.assignedBy,
    });

    await auditService.logSuccess({
      action: 'rbac.user_role.assigned',
      summary: `Assigned RBAC role ${body.roleId} to user ${params.userId}`,
      actor: apiActor(body.assignedBy),
      entity: {
        type: 'auth',
        id: params.userId,
        name: params.userId,
      },
      metadata: {
        userId: params.userId,
        roleId: body.roleId,
        assignment,
      },
    });

    return {
      success: true,
      data: assignment,
    };
  });

  app.delete('/api/v1/rbac/users/:userId/roles/:roleId', async (request, reply) => {
    const params = userRoleParamsSchema.parse(request.params);
    const removed = rbacService.removeUserRole(params.userId, params.roleId);

    if (!removed) {
      await auditService.logFailure({
        action: 'rbac.user_role.remove_failed',
        summary: `Failed to remove RBAC role ${params.roleId} from user ${params.userId}`,
        actor: apiActor(),
        entity: {
          type: 'auth',
          id: params.userId,
          name: params.userId,
        },
        severity: 'warning',
        metadata: {
          userId: params.userId,
          roleId: params.roleId,
          reason: 'assignment_not_found',
        },
      });

      reply.code(404);
      return {
        success: false,
        error: 'RBAC role assignment not found',
      };
    }

    await auditService.logSuccess({
      action: 'rbac.user_role.removed',
      summary: `Removed RBAC role ${params.roleId} from user ${params.userId}`,
      actor: apiActor(),
      entity: {
        type: 'auth',
        id: params.userId,
        name: params.userId,
      },
      metadata: {
        userId: params.userId,
        roleId: params.roleId,
        removed,
      },
    });

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

    const result = rbacService.checkPermission({
      principal,
      permission: body.permission as RbacPermission,
    });

    await auditService.logSuccess({
      action: 'rbac.permission.checked',
      summary: `RBAC permission check ${result.allowed ? 'allowed' : 'denied'} for ${body.permission}`,
      actor: apiActor(principal.userId),
      entity: {
        type: 'auth',
        id: principal.userId ?? 'anonymous-principal',
        name: principal.userId ?? 'Anonymous Principal',
      },
      severity: result.allowed ? 'info' : 'warning',
      metadata: {
        principal,
        permission: body.permission,
        result,
      },
    });

    return {
      success: true,
      data: result,
    };
  });
}
