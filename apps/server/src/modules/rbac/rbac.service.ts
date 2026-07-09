import { rbacStore } from './rbac.store.js';
import type {
  AssignUserRoleInput,
  RbacPermission,
  RbacPermissionCheckInput,
  RbacPermissionCheckResult,
  RbacPrincipal,
  RbacRole,
  UserPermissionResult,
} from './rbac.types.js';

function nowIso(): string {
  return new Date().toISOString();
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function permissionMatches(granted: RbacPermission, required: RbacPermission): boolean {
  if (granted === '*') {
    return true;
  }

  if (granted === required) {
    return true;
  }

  const [grantedResource, grantedAction] = granted.split(':');
  const [requiredResource] = required.split(':');

  return grantedResource === requiredResource && grantedAction === '*';
}

export class RbacService {
  public listRoles(): RbacRole[] {
    return rbacStore.listRoles();
  }

  public getRole(roleId: string): RbacRole | null {
    return rbacStore.getRole(roleId);
  }

  public assignUserRole(input: AssignUserRoleInput) {
    return rbacStore.assignUserRole(input);
  }

  public removeUserRole(userId: string, roleId: string): boolean {
    return rbacStore.removeUserRole(userId, roleId);
  }

  public listUserRoleAssignments(userId: string) {
    return rbacStore.listUserRoleAssignments(userId);
  }

  public getUserPermissions(userId: string): UserPermissionResult {
    const assignments = rbacStore.listUserRoleAssignments(userId);
    const roles = assignments
      .map((assignment) => rbacStore.getRole(assignment.roleId))
      .filter((role): role is RbacRole => Boolean(role));

    return {
      userId,
      roleIds: roles.map((role) => role.id),
      permissions: unique(roles.flatMap((role) => role.permissions)),
      generatedAt: nowIso(),
    };
  }

  public resolvePrincipalPermissions(principal: RbacPrincipal): {
    roleIds: string[];
    permissions: RbacPermission[];
  } {
    const roleIds = unique([
      ...(principal.roleIds ?? []),
      ...(principal.userId ? this.getUserPermissions(principal.userId).roleIds : []),
    ]);

    const rolePermissions = roleIds
      .map((roleId) => rbacStore.getRole(roleId))
      .filter((role): role is RbacRole => Boolean(role))
      .flatMap((role) => role.permissions);

    return {
      roleIds,
      permissions: unique([
        ...(principal.permissions ?? []),
        ...rolePermissions,
      ]),
    };
  }

  public checkPermission(input: RbacPermissionCheckInput): RbacPermissionCheckResult {
    if (input.principal.isSuperAdmin) {
      return {
        allowed: true,
        permission: input.permission,
        matchedBy: '*',
        roleIds: input.principal.roleIds ?? [],
        generatedAt: nowIso(),
      };
    }

    const resolved = this.resolvePrincipalPermissions(input.principal);
    const matchedBy = resolved.permissions
      .find((permission) => permissionMatches(permission, input.permission));

    return {
      allowed: Boolean(matchedBy),
      permission: input.permission,
      matchedBy,
      roleIds: resolved.roleIds,
      generatedAt: nowIso(),
    };
  }

  public assertPermission(input: RbacPermissionCheckInput): void {
    const result = this.checkPermission(input);

    if (!result.allowed) {
      throw new Error(`Permission denied: ${input.permission}`);
    }
  }
}

export const rbacService = new RbacService();
