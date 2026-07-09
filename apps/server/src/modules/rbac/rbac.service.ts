import { rbacRepository } from './rbac.repository.js';
import type {
  AssignUserRoleInput,
  RbacPermission,
  RbacPermissionCheckInput,
  RbacPermissionCheckResult,
  RbacPrincipal,
  RbacRole,
  RbacUserRoleAssignment,
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
  private readyPromise: Promise<void> | null = null;

  public async seedDefaults(): Promise<void> {
    await this.ensureReady();
  }

  public async listRoles(): Promise<RbacRole[]> {
    await this.ensureReady();

    return rbacRepository.listRoles();
  }

  public async getRole(roleId: string): Promise<RbacRole | null> {
    await this.ensureReady();

    return rbacRepository.getRole(roleId);
  }

  public async assignUserRole(input: AssignUserRoleInput): Promise<RbacUserRoleAssignment> {
    await this.ensureReady();

    return rbacRepository.assignUserRole(input);
  }

  public async removeUserRole(userId: string, roleId: string): Promise<boolean> {
    await this.ensureReady();

    return rbacRepository.removeUserRole(userId, roleId);
  }

  public async listUserRoleAssignments(userId: string): Promise<RbacUserRoleAssignment[]> {
    await this.ensureReady();

    return rbacRepository.listUserRoleAssignments(userId);
  }

  public async getUserPermissions(userId: string): Promise<UserPermissionResult> {
    await this.ensureReady();

    const assignments = await rbacRepository.listUserRoleAssignments(userId);
    const roles = (
      await Promise.all(assignments.map((assignment) => rbacRepository.getRole(assignment.roleId)))
    ).filter((role): role is RbacRole => Boolean(role));

    return {
      userId,
      roleIds: roles.map((role) => role.id),
      permissions: unique(roles.flatMap((role) => role.permissions)),
      generatedAt: nowIso(),
    };
  }

  public async resolvePrincipalPermissions(principal: RbacPrincipal): Promise<{
    roleIds: string[];
    permissions: RbacPermission[];
  }> {
    await this.ensureReady();

    const userPermissions = principal.userId
      ? await this.getUserPermissions(principal.userId)
      : {
          roleIds: [],
          permissions: [],
        };

    const roleIds = unique([...(principal.roleIds ?? []), ...userPermissions.roleIds]);

    const rolePermissions = (
      await Promise.all(roleIds.map((roleId) => rbacRepository.getRole(roleId)))
    )
      .filter((role): role is RbacRole => Boolean(role))
      .flatMap((role) => role.permissions);

    return {
      roleIds,
      permissions: unique([...(principal.permissions ?? []), ...rolePermissions]),
    };
  }

  public async checkPermission(
    input: RbacPermissionCheckInput,
  ): Promise<RbacPermissionCheckResult> {
    if (input.principal.isSuperAdmin) {
      return {
        allowed: true,
        permission: input.permission,
        matchedBy: '*',
        roleIds: input.principal.roleIds ?? [],
        generatedAt: nowIso(),
      };
    }

    const resolved = await this.resolvePrincipalPermissions(input.principal);
    const matchedBy = resolved.permissions.find((permission) =>
      permissionMatches(permission, input.permission),
    );

    return {
      allowed: Boolean(matchedBy),
      permission: input.permission,
      matchedBy,
      roleIds: resolved.roleIds,
      generatedAt: nowIso(),
    };
  }

  public async assertPermission(input: RbacPermissionCheckInput): Promise<void> {
    const result = await this.checkPermission(input);

    if (!result.allowed) {
      throw new Error(`Permission denied: ${input.permission}`);
    }
  }

  private async ensureReady(): Promise<void> {
    if (!this.readyPromise) {
      this.readyPromise = rbacRepository.seedDefaults();
    }

    return this.readyPromise;
  }
}

export const rbacService = new RbacService();
