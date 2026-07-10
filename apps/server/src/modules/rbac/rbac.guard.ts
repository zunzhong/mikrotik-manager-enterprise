import type { FastifyReply, FastifyRequest } from 'fastify';
import { rbacService } from './rbac.service.js';
import type { RbacPermission, RbacPrincipal } from './rbac.types.js';

type RequestWithRbacContext = FastifyRequest & {
  rbacPrincipal?: RbacPrincipal | null;
};

export interface RbacGuardOptions {
  permission: RbacPermission;
  errorMessage?: string;
}

export interface RbacGuardResult {
  allowed: boolean;
  principal: RbacPrincipal;
  response?: {
    success: false;
    error: string;
    data: {
      permission: RbacPermission;
      allowed: false;
      userId?: string;
      roleIds: string[];
      generatedAt: string;
    };
  };
}

function headerValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function parseCsvHeader(value: string | string[] | undefined): string[] {
  const raw = headerValue(value);

  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBooleanHeader(value: string | string[] | undefined): boolean {
  const raw = headerValue(value);

  if (!raw) {
    return false;
  }

  return ['1', 'true', 'yes', 'y'].includes(raw.toLowerCase());
}

export function getRbacPrincipalFromRequestContext(request: FastifyRequest): RbacPrincipal | null {
  return (request as RequestWithRbacContext).rbacPrincipal ?? null;
}

export function getRbacPrincipalFromHeaders(request: FastifyRequest): RbacPrincipal {
  return {
    userId: headerValue(request.headers['x-user-id']) ?? undefined,
    roleIds: parseCsvHeader(request.headers['x-rbac-roles']),
    permissions: parseCsvHeader(request.headers['x-rbac-permissions']) as RbacPermission[],
    isSuperAdmin: parseBooleanHeader(request.headers['x-rbac-super-admin']),
  };
}

export function getRbacPrincipalFromRequest(request: FastifyRequest): RbacPrincipal {
  const contextPrincipal = getRbacPrincipalFromRequestContext(request);

  if (contextPrincipal) {
    return contextPrincipal;
  }

  return getRbacPrincipalFromHeaders(request);
}

export async function requireRbacPermission(
  request: FastifyRequest,
  options: RbacGuardOptions,
): Promise<RbacGuardResult> {
  const principal = getRbacPrincipalFromRequest(request);
  const check = await rbacService.checkPermission({
    principal,
    permission: options.permission,
  });

  if (check.allowed) {
    return {
      allowed: true,
      principal,
    };
  }

  return {
    allowed: false,
    principal,
    response: {
      success: false,
      error: options.errorMessage ?? 'Permission denied',
      data: {
        permission: options.permission,
        allowed: false,
        userId: principal.userId,
        roleIds: principal.roleIds ?? [],
        generatedAt: new Date().toISOString(),
      },
    },
  };
}

export function createRbacPreHandler(options: RbacGuardOptions) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = await requireRbacPermission(request, options);

    if (!result.allowed && result.response) {
      reply.code(403).send(result.response);
    }
  };
}

export function rbacGuard(permission: RbacPermission, errorMessage?: string) {
  return createRbacPreHandler({
    permission,
    errorMessage,
  });
}
