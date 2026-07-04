import { apiGet, apiPost } from '../../lib/api';

export interface Permission {
  id: string;
  key: string;
  name: string;
  description?: string;
  category: string;
  createdAt: string;
}

export interface Role {
  id: string;
  key: string;
  name: string;
  description?: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  permissions: Array<{ id: string; permission: Permission }>;
  users: Array<{ id: string; userId: string; roleId: string }>;
}

export interface AdminUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  roles: Array<{ id: string; role: Role }>;
}

export const rbacApi = {
  users: () => apiGet<AdminUser[]>('/api/v1/admin/users'),
  roles: () => apiGet<Role[]>('/api/v1/admin/roles'),
  permissions: () => apiGet<Permission[]>('/api/v1/admin/permissions'),
  assignUserRole: (userId: string, roleId: string) =>
    apiPost(`/api/v1/admin/users/${userId}/roles`, { roleId }),
  assignRolePermission: (roleId: string, permissionId: string) =>
    apiPost(`/api/v1/admin/roles/${roleId}/permissions`, { permissionId }),
};
