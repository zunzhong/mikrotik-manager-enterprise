import { apiDelete, apiGet, apiPost } from '../../lib/api';
import type {
  RbacPermission,
  RbacPermissionCheckResult,
  RbacPrincipal,
  RbacUserRoleAssignment,
  UserPermissionResult,
} from './rbac.types';

export interface Permission {
  id: string;
  key: string;
  name: string;
  category: string;
  description?: string;
}

export interface RolePermission {
  id: string;
  permissionId: string;
  permission: Permission;
}

export interface Role {
  id: string;
  key: string;
  name: string;
  description: string;
  permissions: RolePermission[];
  system?: boolean;
  isSystem?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserRole {
  id: string;
  roleId: string;
  role: Role;
}

export interface AdminUser {
  id: string;
  email?: string;
  name?: string;
  isActive: boolean;
  createdAt: string;
  roles: AdminUserRole[];
}

interface ServerRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  system?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function permissionCategory(permissionKey: string): string {
  return permissionKey.includes(':') ? permissionKey.split(':')[0] : 'system';
}

function permissionName(permissionKey: string): string {
  return permissionKey
    .replace(/[:_*.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function toPermission(permissionKey: string): Permission {
  return {
    id: permissionKey,
    key: permissionKey,
    name: permissionName(permissionKey),
    category: permissionCategory(permissionKey),
    description: permissionKey,
  };
}

function toRolePermission(roleId: string, permissionKey: string): RolePermission {
  const permission = toPermission(permissionKey);

  return {
    id: `${roleId}:${permission.id}`,
    permissionId: permission.id,
    permission,
  };
}

function normalizeRole(raw: ServerRole | Role): Role {
  const roleId = raw.id;
  const createdAt = raw.createdAt ?? nowIso();
  const updatedAt = raw.updatedAt ?? createdAt;

  return {
    id: roleId,
    key: 'key' in raw && raw.key ? raw.key : roleId,
    name: raw.name,
    description: raw.description,
    system: raw.system,
    isSystem: 'isSystem' in raw ? raw.isSystem : raw.system,
    createdAt,
    updatedAt,
    permissions: (raw.permissions ?? []).map((item) => {
      if (typeof item === 'string') {
        return toRolePermission(roleId, item);
      }

      return item;
    }),
  };
}

function normalizeRoles(rawRoles: ServerRole[] | Role[]): Role[] {
  return rawRoles.map((role) => normalizeRole(role));
}

function normalizePermissions(rawPermissions: string[] | Permission[]): Permission[] {
  return rawPermissions.map((permission) => {
    if (typeof permission === 'string') {
      return toPermission(permission);
    }

    return permission;
  });
}

export const rbacApi = {
  permissions: async (): Promise<Permission[]> => {
    const permissions = await apiGet<string[] | Permission[]>('/api/v1/rbac/permissions');

    return normalizePermissions(permissions);
  },

  roles: async (): Promise<Role[]> => {
    const roles = await apiGet<ServerRole[] | Role[]>('/api/v1/rbac/roles');

    return normalizeRoles(roles);
  },

  role: async (roleId: string): Promise<Role> => {
    const role = await apiGet<ServerRole | Role>(`/api/v1/rbac/roles/${roleId}`);

    return normalizeRole(role);
  },

  users: async (): Promise<AdminUser[]> => [],

  userRoles: (userId: string): Promise<RbacUserRoleAssignment[]> =>
    apiGet<RbacUserRoleAssignment[]>(`/api/v1/rbac/users/${userId}/roles`),

  userPermissions: (userId: string): Promise<UserPermissionResult> =>
    apiGet<UserPermissionResult>(`/api/v1/rbac/users/${userId}/permissions`),

  assignUserRole: (
    userId: string,
    roleId: string,
    assignedBy = 'dashboard',
  ): Promise<RbacUserRoleAssignment> =>
    apiPost<RbacUserRoleAssignment>(`/api/v1/rbac/users/${userId}/roles`, {
      roleId,
      assignedBy,
    }),

  removeUserRole: (
    userId: string,
    roleId: string,
  ): Promise<{ userId: string; roleId: string; removed: boolean }> =>
    apiDelete<{ userId: string; roleId: string; removed: boolean }>(
      `/api/v1/rbac/users/${userId}/roles/${roleId}`,
    ),

  checkPermission: (
    principal: RbacPrincipal,
    permission: RbacPermission,
  ): Promise<RbacPermissionCheckResult> =>
    apiPost<RbacPermissionCheckResult>('/api/v1/rbac/check', {
      principal,
      permission,
    }),

  assignRolePermission: async (roleId: string, permissionId: string): Promise<Role> => {
    const role = await rbacApi.role(roleId);

    if (
      role.permissions.some(
        (item) => item.permission.id === permissionId || item.permission.key === permissionId,
      )
    ) {
      return role;
    }

    return {
      ...role,
      permissions: [...role.permissions, toRolePermission(role.id, permissionId)],
    };
  },

  removeRolePermission: async (roleId: string, permissionId: string): Promise<Role> => {
    const role = await rbacApi.role(roleId);

    return {
      ...role,
      permissions: role.permissions.filter(
        (item) =>
          item.id !== permissionId &&
          item.permissionId !== permissionId &&
          item.permission.id !== permissionId &&
          item.permission.key !== permissionId,
      ),
    };
  },

  exportUrl: (format: 'json' | 'csv') => `/api/v1/rbac/export?format=${format}`,
};
