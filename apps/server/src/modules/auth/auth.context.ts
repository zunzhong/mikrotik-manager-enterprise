import type { FastifyRequest } from 'fastify';
import type { RbacPrincipal } from '../rbac/index.js';
import { authSessionStateFromRequest, rbacPrincipalFromAuthSession } from './auth.session.js';
import type { AuthSessionPrincipal, AuthSessionState } from './auth.types.js';

declare module 'fastify' {
  interface FastifyRequest {
    authSession?: AuthSessionState;
    rbacPrincipal?: RbacPrincipal | null;
  }
}

export interface AuthRequestContext {
  authenticated: boolean;
  authState: AuthSessionState;
  rbacPrincipal: RbacPrincipal | null;
  principal?: AuthSessionPrincipal;
}

export function resolveAuthRequestContext(request: FastifyRequest): AuthRequestContext {
  const authState = request.authSession ?? authSessionStateFromRequest(request);
  const principal = authState.authenticated ? authState.principal : undefined;
  const rbacPrincipal = principal ? rbacPrincipalFromAuthSession(principal) : null;

  return {
    authenticated: Boolean(principal),
    authState,
    rbacPrincipal,
    ...(principal ? { principal } : {}),
  };
}

export function attachAuthRequestContext(
  request: FastifyRequest,
  context: AuthRequestContext = resolveAuthRequestContext(request),
): AuthRequestContext {
  request.authSession = context.authState;
  request.rbacPrincipal = context.rbacPrincipal;

  return context;
}

export function getAuthRequestContext(request: FastifyRequest): AuthRequestContext {
  const context = resolveAuthRequestContext(request);

  if (!request.authSession || request.rbacPrincipal === undefined) {
    return attachAuthRequestContext(request, context);
  }

  return context;
}

export function getAuthRbacPrincipal(request: FastifyRequest): RbacPrincipal | null {
  return getAuthRequestContext(request).rbacPrincipal;
}
