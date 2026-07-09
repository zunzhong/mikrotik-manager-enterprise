import { Prisma } from '@prisma/client';
import { prisma } from '../../database/index.js';
import { DEFAULT_RBAC_ROLES } from './rbac.roles.js';
import type {
  AssignUserRoleInput,
  RbacPermission,
  RbacRole,
  RbacUserRoleAssignment,
} from './rbac.types.js';

type RoleWithPermissions = Prisma.RoleGetPayload<{
  include: {
    permissions: {
      include: {
        permission: true;
      };
    };
  };
}>;

type UserRoleWithRole = Prisma.UserRoleGetPayload<{
  include: {
    role: true;
  };
}>;

function nowIso(): string {
  return new Date().toISOString();
}

function permissionCategory(permissionKey: string): string {
  return permissionKey.includes(':') ? permissionKey.split(':')[0] : 'system';
}

function permissionName(permissionKey: string): string {
  if (permissionKey === '*') {
    return 'Super Admin';
  }

  return permissionKey
    .replace(/[:_*.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function toRbacRole(record: RoleWithPermissions): RbacRole {
  return {
    id: record.key,
    name: record.name,
    description: record.description ?? '',
    permissions: record.permissions.map((item) => item.permission.key as RbacPermission),
    system: record.isSystem,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toAssignment(record: UserRoleWithRole): RbacUserRoleAssignment {
  return {
    id: record.id,
    userId: record.userId,
    roleId: record.role.key,
    createdAt: record.createdAt.toISOString(),
  };
}

export class RbacRepository {
  public async seedDefaults(): Promise<void> {
    for (const role of DEFAULT_RBAC_ROLES) {
      await this.upsertRole(role);
    }
  }

  public async listRoles(): Promise<RbacRole[]> {
    const records = await prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: {
        key: 'asc',
      },
    });

    return records.map((record) => toRbacRole(record));
  }

  public async getRole(roleId: string): Promise<RbacRole | null> {
    const record = await prisma.role.findUnique({
      where: {
        key: roleId,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return record ? toRbacRole(record) : null;
  }

  public async upsertRole(role: RbacRole): Promise<RbacRole> {
    const record = await prisma.role.upsert({
      where: {
        key: role.id,
      },
      create: {
        key: role.id,
        name: role.name,
        description: role.description,
        isSystem: role.system ?? false,
      },
      update: {
        name: role.name,
        description: role.description,
        isSystem: role.system ?? false,
      },
    });

    for (const permissionKey of role.permissions) {
      const permission = await this.upsertPermission(permissionKey);

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: record.id,
            permissionId: permission.id,
          },
        },
        create: {
          roleId: record.id,
          permissionId: permission.id,
        },
        update: {},
      });
    }

    const next = await this.getRole(role.id);

    if (!next) {
      throw new Error(`RBAC role upsert failed: ${role.id}`);
    }

    return next;
  }

  public async assignUserRole(input: AssignUserRoleInput): Promise<RbacUserRoleAssignment> {
    const role = await prisma.role.findUnique({
      where: {
        key: input.roleId,
      },
    });

    if (!role) {
      throw new Error(`RBAC role not found: ${input.roleId}`);
    }

    const assignment = await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: input.userId,
          roleId: role.id,
        },
      },
      create: {
        userId: input.userId,
        roleId: role.id,
      },
      update: {},
      include: {
        role: true,
      },
    });

    return toAssignment(assignment);
  }

  public async removeUserRole(userId: string, roleId: string): Promise<boolean> {
    const role = await prisma.role.findUnique({
      where: {
        key: roleId,
      },
    });

    if (!role) {
      return false;
    }

    const result = await prisma.userRole.deleteMany({
      where: {
        userId,
        roleId: role.id,
      },
    });

    return result.count > 0;
  }

  public async listUserRoleAssignments(userId: string): Promise<RbacUserRoleAssignment[]> {
    const records = await prisma.userRole.findMany({
      where: {
        userId,
      },
      include: {
        role: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return records.map((record) => toAssignment(record));
  }

  public async listAllAssignments(): Promise<RbacUserRoleAssignment[]> {
    const records = await prisma.userRole.findMany({
      include: {
        role: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return records.map((record) => toAssignment(record));
  }

  private async upsertPermission(permissionKey: RbacPermission) {
    return prisma.permission.upsert({
      where: {
        key: permissionKey,
      },
      create: {
        key: permissionKey,
        name: permissionName(permissionKey),
        description: permissionKey,
        category: permissionCategory(permissionKey),
      },
      update: {
        name: permissionName(permissionKey),
        description: permissionKey,
        category: permissionCategory(permissionKey),
      },
    });
  }

  public createTransientAssignment(input: AssignUserRoleInput): RbacUserRoleAssignment {
    return {
      id: `rbac_assignment_${Date.now()}`,
      userId: input.userId,
      roleId: input.roleId,
      assignedBy: input.assignedBy,
      createdAt: nowIso(),
    };
  }
}

export const rbacRepository = new RbacRepository();
