import { DEFAULT_RBAC_ROLES } from './rbac.roles.js';
import type {
  AssignUserRoleInput,
  RbacRole,
  RbacUserRoleAssignment,
} from './rbac.types.js';

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export class RbacStore {
  private readonly roles = new Map<string, RbacRole>();
  private readonly assignments = new Map<string, RbacUserRoleAssignment>();

  public constructor() {
    this.seedDefaults();
  }

  public seedDefaults(): void {
    for (const role of DEFAULT_RBAC_ROLES) {
      this.roles.set(role.id, role);
    }
  }

  public listRoles(): RbacRole[] {
    return Array.from(this.roles.values()).sort((a, b) => a.id.localeCompare(b.id));
  }

  public getRole(roleId: string): RbacRole | null {
    return this.roles.get(roleId) ?? null;
  }

  public upsertRole(role: RbacRole): RbacRole {
    const now = nowIso();
    const next: RbacRole = {
      ...role,
      createdAt: role.createdAt ?? now,
      updatedAt: now,
    };

    this.roles.set(next.id, next);

    return next;
  }

  public assignUserRole(input: AssignUserRoleInput): RbacUserRoleAssignment {
    const role = this.getRole(input.roleId);

    if (!role) {
      throw new Error(`RBAC role not found: ${input.roleId}`);
    }

    const existing = this.listUserRoleAssignments(input.userId)
      .find((assignment) => assignment.roleId === input.roleId);

    if (existing) {
      return existing;
    }

    const assignment: RbacUserRoleAssignment = {
      id: createId('rbac_assignment'),
      userId: input.userId,
      roleId: input.roleId,
      assignedBy: input.assignedBy,
      createdAt: nowIso(),
    };

    this.assignments.set(assignment.id, assignment);

    return assignment;
  }

  public removeUserRole(userId: string, roleId: string): boolean {
    const existing = this.listUserRoleAssignments(userId)
      .find((assignment) => assignment.roleId === roleId);

    if (!existing) {
      return false;
    }

    return this.assignments.delete(existing.id);
  }

  public listUserRoleAssignments(userId: string): RbacUserRoleAssignment[] {
    return Array.from(this.assignments.values())
      .filter((assignment) => assignment.userId === userId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  public listAllAssignments(): RbacUserRoleAssignment[] {
    return Array.from(this.assignments.values())
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}

export const rbacStore = new RbacStore();
