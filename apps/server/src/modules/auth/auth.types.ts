import type { RbacPermission } from '../rbac/index.js';

export type AuthSessionSource = 'header' | 'session' | 'api-key' | 'dev';

export interface AuthSessionPrincipal {
  userId: string;
  email?: string;
  name?: string;
  roleIds: string[];
  permissions: RbacPermission[];
  isSuperAdmin: boolean;
  source: AuthSessionSource;
  issuedAt: string;
  expiresAt?: string;
}

export interface CreateAuthSessionPrincipalInput {
  userId: string;
  email?: string;
  name?: string;
  roleIds?: string[];
  permissions?: RbacPermission[];
  isSuperAdmin?: boolean;
  source?: AuthSessionSource;
  issuedAt?: string;
  expiresAt?: string;
}

export interface AuthSessionState {
  authenticated: boolean;
  principal?: AuthSessionPrincipal;
  reason?: string;
}

export interface AuthHeaderNames {
  userId: string;
  email: string;
  name: string;
  roles: string;
  permissions: string;
  superAdmin: string;
}

export interface AuthHeaderPrincipalInput {
  userId?: string;
  email?: string;
  name?: string;
  roles?: string;
  permissions?: string;
  superAdmin?: string;
}

export interface AuthCurrentUserResponse {
  authenticated: boolean;
  user?: {
    id: string;
    email?: string;
    name?: string;
    roleIds: string[];
    permissions: RbacPermission[];
    isSuperAdmin: boolean;
  };
}
