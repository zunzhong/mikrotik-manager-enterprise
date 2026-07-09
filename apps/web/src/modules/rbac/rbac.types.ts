export type RbacPermission = string;

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

export interface RbacPermissionCheckResult {
  allowed: boolean;
  permission: RbacPermission;
  matchedBy?: RbacPermission;
  roleIds: string[];
  generatedAt: string;
}

export interface UserPermissionResult {
  userId: string;
  roleIds: string[];
  permissions: RbacPermission[];
  generatedAt: string;
}
