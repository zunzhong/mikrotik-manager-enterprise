# Sprint 02 Task 11 Commit 01 — RBAC Prisma Repository

Starts persistent RBAC storage.

## Current database schema

The project already has these Prisma models:

```txt
User
Role
Permission
UserRole
RolePermission
```

Therefore this commit does not change `apps/server/prisma/schema.prisma`.

## Files

```txt
apps/server/src/modules/rbac/rbac.repository.ts
apps/server/src/modules/rbac/index.ts
```

## Repository methods

```txt
seedDefaults()
listRoles()
getRole()
upsertRole()
assignUserRole()
removeUserRole()
listUserRoleAssignments()
listAllAssignments()
```

## Mapping

Prisma role storage:

```txt
Role.id   = database cuid
Role.key  = RBAC role key such as owner/admin/operator/auditor/viewer
```

API-facing RBAC role:

```txt
RbacRole.id = Role.key
```

User role assignment storage:

```txt
UserRole.roleId = database Role.id
```

API-facing assignment:

```txt
RbacUserRoleAssignment.roleId = Role.key
```

## Important limitation

This commit only adds the repository.

The service still uses the in-memory store until the next commit:

```txt
Commit 02 — RBAC Service Persistence
```

## Check

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm build
```
