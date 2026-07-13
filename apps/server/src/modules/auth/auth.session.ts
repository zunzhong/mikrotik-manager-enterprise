import type { FastifyRequest } from 'fastify';
import type { RbacPermission, RbacPrincipal } from '../rbac/index.js';
import type {
  AuthCurrentUserResponse,
  AuthHeaderNames,
  AuthHeaderPrincipalInput,
  AuthSessionPrincipal,
  AuthSessionState,
  CreateAuthSessionPrincipalInput,
} from './auth.types.js';
import { tokenService } from './application/token.service.js';

export const DEFAULT_AUTH_HEADER_NAMES: AuthHeaderNames = {
  userId: 'x-user-id',
  email: 'x-user-email',
  name: 'x-user-name',
  roles: 'x-rbac-roles',
  permissions: 'x-rbac-permissions',
  superAdmin: 'x-rbac-super-admin',
};

function nowIso(): string {
  return new Date().toISOString();
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function parseCsv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return ['1', 'true', 'yes', 'y'].includes(value.toLowerCase());
}

function headerValue(request: FastifyRequest, name: string): string | undefined {
  const value = request.headers[name.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function createAuthSessionPrincipal(
  input: CreateAuthSessionPrincipalInput,
): AuthSessionPrincipal {
  return {
    userId: input.userId,
    email: input.email,
    name: input.name,
    roleIds: unique(input.roleIds ?? []),
    permissions: unique(input.permissions ?? []),
    isSuperAdmin: input.isSuperAdmin ?? false,
    source: input.source ?? 'session',
    issuedAt: input.issuedAt ?? nowIso(),
    expiresAt: input.expiresAt,
  };
}

export function createAnonymousAuthState(reason = 'Unauthenticated'): AuthSessionState {
  return {
    authenticated: false,
    reason,
  };
}

export function createAuthenticatedAuthState(principal: AuthSessionPrincipal): AuthSessionState {
  return {
    authenticated: true,
    principal,
  };
}

export function authHeaderInputFromRequest(
  request: FastifyRequest,
  headerNames: AuthHeaderNames = DEFAULT_AUTH_HEADER_NAMES,
): AuthHeaderPrincipalInput {
  return {
    userId: headerValue(request, headerNames.userId),
    email: headerValue(request, headerNames.email),
    name: headerValue(request, headerNames.name),
    roles: headerValue(request, headerNames.roles),
    permissions: headerValue(request, headerNames.permissions),
    superAdmin: headerValue(request, headerNames.superAdmin),
  };
}

export function authSessionPrincipalFromHeaders(
  input: AuthHeaderPrincipalInput,
): AuthSessionPrincipal | null {
  const userId = input.userId ?? input.email;

  if (!userId) {
    return null;
  }

  return createAuthSessionPrincipal({
    userId,
    email: input.email,
    name: input.name,
    roleIds: parseCsv(input.roles),
    permissions: parseCsv(input.permissions) as RbacPermission[],
    isSuperAdmin: parseBoolean(input.superAdmin),
    source: 'header',
  });
}

export function authSessionStateFromRequest(request: FastifyRequest): AuthSessionState {
  const authorization = headerValue(request, 'authorization');
  const bearerToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : undefined;

  if (bearerToken) {
    const payload = tokenService.verify(bearerToken);

    if (!payload) {
      return createAnonymousAuthState('Invalid or expired bearer token');
    }

    return createAuthenticatedAuthState(
      createAuthSessionPrincipal({
        userId: payload.userId,
        email: payload.email,
        roleIds: [payload.role],
        isSuperAdmin: payload.role === 'admin' || payload.role === 'super-admin',
        source: 'session',
        expiresAt: new Date(payload.exp * 1000).toISOString(),
      }),
    );
  }

  if (process.env.NODE_ENV === 'production') {
    return createAnonymousAuthState('Missing bearer token');
  }

  const principal = authSessionPrincipalFromHeaders(authHeaderInputFromRequest(request));

  if (!principal) {
    return createAnonymousAuthState('Missing auth principal');
  }

  return createAuthenticatedAuthState(principal);
}

export function rbacPrincipalFromAuthSession(principal: AuthSessionPrincipal): RbacPrincipal {
  return {
    userId: principal.userId,
    roleIds: principal.roleIds,
    permissions: principal.permissions,
    isSuperAdmin: principal.isSuperAdmin,
  };
}

export function currentUserResponseFromAuthState(state: AuthSessionState): AuthCurrentUserResponse {
  if (!state.authenticated || !state.principal) {
    return {
      authenticated: false,
    };
  }

  return {
    authenticated: true,
    user: {
      id: state.principal.userId,
      email: state.principal.email,
      name: state.principal.name,
      roleIds: state.principal.roleIds,
      permissions: state.principal.permissions,
      isSuperAdmin: state.principal.isSuperAdmin,
    },
  };
}
