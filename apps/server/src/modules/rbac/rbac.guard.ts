import type { FastifyReply, FastifyRequest } from 'fastify';
import { rbacService } from './rbac.service.js';
import type { RbacPermission, RbacPermissionCheckResult, RbacPrincipal } from './rbac.types.js';

export interface RbacRequestPrincipalOptions {
  userIdHeader?: string;
  rolesHeader?: string;
  permissionsHeader?: string;
  superAdminHeader?: string;
}

export interface RbacGuardOptions extends RbacRequestPrincipalOptions {
  permission: RbacPermission;
  errorMessage?: string;
}

export interface RbacGuardFailureResponse {
  success: false;
  error: string;
  data: {
    permission: RbacPermission;
    allowed: false;
    roleIds: string[];
    matchedBy?: RbacPermission;
    generatedAt: string;
  };
}

export interface RbacGuardSuccess {
  allowed: true;
  principal: RbacPrincipal;
  result: RbacPermissionCheckResult;
}

export interface RbacGuardFailure {
  allowed: false;
  principal: RbacPrincipal;
  result: RbacPermissionCheckResult;
  response: RbacGuardFailureResponse;
}

export type RbacGuardResult = RbacGuardSuccess | RbacGuardFailure;

function readHeader(request: FastifyRequest, name: string): string | undefined {
  const value = request.headers[name.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
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

function parseBoolean(value: string | undefined): boolean | undefined {
  if (!value) {
    return undefined;
  }

  return ['1', 'true', 'yes', 'y'].includes(value.toLowerCase());
}

export function getRbacPrincipalFromRequest(
  request: FastifyRequest,
  options: RbacRequestPrincipalOptions = {},
): RbacPrincipal {
  const userId = readHeader(request, options.userIdHeader ?? 'x-user-id');
  const roleIds = parseCsv(readHeader(request, options.rolesHeader ?? 'x-rbac-roles'));
  const permissions = parseCsv(
    readHeader(request, options.permissionsHeader ?? 'x-rbac-permissions'),
  ) as RbacPermission[];
  const isSuperAdmin = parseBoolean(
    readHeader(request, options.superAdminHeader ?? 'x-rbac-super-admin'),
  );

  return {
    userId,
    roleIds: roleIds.length > 0 ? roleIds : undefined,
    permissions: permissions.length > 0 ? permissions : undefined,
    isSuperAdmin,
  };
}

export async function requireRbacPermission(
  request: FastifyRequest,
  options: RbacGuardOptions,
): Promise<RbacGuardResult> {
  const principal = getRbacPrincipalFromRequest(request, options);
  const result = await rbacService.checkPermission({
    principal,
    permission: options.permission,
  });

  if (result.allowed) {
    return {
      allowed: true,
      principal,
      result,
    };
  }

  return {
    allowed: false,
    principal,
    result,
    response: {
      success: false,
      error: options.errorMessage ?? 'Permission denied',
      data: {
        permission: options.permission,
        allowed: false,
        roleIds: result.roleIds,
        matchedBy: result.matchedBy,
        generatedAt: result.generatedAt,
      },
    },
  };
}

export function createRbacPreHandler(options: RbacGuardOptions) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const guardResult = await requireRbacPermission(request, options);

    if (!guardResult.allowed) {
      reply.code(403).send(guardResult.response);
    }
  };
}

export function rbacGuard(permission: RbacPermission) {
  return createRbacPreHandler({ permission });
}
