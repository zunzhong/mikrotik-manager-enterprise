import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { RbacPrincipal } from '../rbac/index.js';
import {
  attachAuthRequestContext,
  getAuthRequestContext,
  type AuthRequestContext,
} from './auth.context.js';

export interface AuthContextMiddlewareOptions {
  enabled?: boolean;
}

export async function attachAuthContextPreHandler(
  request: FastifyRequest,
  _reply?: FastifyReply,
): Promise<void> {
  attachAuthRequestContext(request);
}

export async function authContextMiddleware(
  app: FastifyInstance,
  options: AuthContextMiddlewareOptions = {},
): Promise<void> {
  const enabled = options.enabled ?? true;

  if (!enabled) {
    return;
  }

  app.addHook('preHandler', attachAuthContextPreHandler);
}

export function getRequiredAuthContext(request: FastifyRequest): AuthRequestContext {
  return getAuthRequestContext(request);
}

export function getRequiredRbacPrincipal(request: FastifyRequest): RbacPrincipal | null {
  return getRequiredAuthContext(request).rbacPrincipal;
}
