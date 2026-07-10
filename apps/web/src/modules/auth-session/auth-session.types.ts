export type AuthSessionSource = 'header' | 'session' | 'api-key' | 'dev';

export interface AuthSessionUser {
  id: string;
  email?: string;
  name?: string;
  roleIds: string[];
  permissions: string[];
  isSuperAdmin: boolean;
}

export interface AuthCurrentSession {
  authenticated: boolean;
  user?: AuthSessionUser;
}

export interface AuthRbacPrincipal {
  userId?: string;
  roleIds?: string[];
  permissions?: string[];
  isSuperAdmin?: boolean;
}

export interface AuthRbacPrincipalResponse {
  authenticated: boolean;
  principal: AuthRbacPrincipal | null;
}

export interface AuthSessionViewState {
  loading: boolean;
  error: string | null;
  current: AuthCurrentSession | null;
  rbacPrincipal: AuthRbacPrincipalResponse | null;
}
