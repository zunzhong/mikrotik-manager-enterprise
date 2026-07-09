export type RbacResource =
  'system' | 'device' | 'event' | 'alert' | 'notification' | 'audit' | 'rbac' | 'dashboard';

export type RbacAction =
  'read' | 'create' | 'update' | 'delete' | 'manage' | 'export' | 'prune' | 'assign';

export type RbacPermission = '*' | `${RbacResource}:${RbacAction}` | `${RbacResource}:*`;

export interface RbacRole {
  id: string;
  name: string;
  description: string;
  permissions: RbacPermission[];
  system?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RbacUserRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  assignedBy?: string;
  createdAt: string;
}

export interface RbacPrincipal {
  userId?: string;
  roleIds?: string[];
  permissions?: RbacPermission[];
  isSuperAdmin?: boolean;
}

export interface RbacPermissionCheckInput {
  principal: RbacPrincipal;
  permission: RbacPermission;
}

export interface RbacPermissionCheckResult {
  allowed: boolean;
  permission: RbacPermission;
  matchedBy?: RbacPermission;
  roleIds: string[];
  generatedAt: string;
}

export interface AssignUserRoleInput {
  userId: string;
  roleId: string;
  assignedBy?: string;
}

export interface UserPermissionResult {
  userId: string;
  roleIds: string[];
  permissions: RbacPermission[];
  generatedAt: string;
}
