# Sprint 02 Task 11 Commit 02 — RBAC Service Persistence

Switches RBAC service and routes from in-memory storage to Prisma-backed storage.

## Files

```txt
apps/server/src/modules/rbac/rbac.repository.ts
apps/server/src/modules/rbac/rbac.service.ts
apps/server/src/modules/rbac/rbac.routes.ts
```

## Main changes

```txt
RBAC service now uses rbacRepository
RBAC routes now await async service methods
Default roles and permissions are seeded lazily
User role assignment is stored in UserRole
Effective user permissions are resolved from RolePermission
```

## Local dev user fallback

The repository resolves users by:

```txt
User.id
User.email
```

If the user is missing during role assignment, the repository creates a local RBAC user with:

```txt
id = requested userId
email = generated @rbac.local email
role = admin
isActive = true
```

This keeps existing smoke tests such as `demo-user` and `rbac-smoke-user` usable while auth/login is still being built.

## Persistence status

After this commit, the following RBAC data is persisted:

```txt
Role
Permission
RolePermission
User
UserRole
```

## Existing audit integration

Existing audit actions remain active:

```txt
rbac.user_role.assigned
rbac.user_role.assign_failed
rbac.user_role.removed
rbac.user_role.remove_failed
rbac.permission.checked
```

## Check

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm build
```

## Next commit

```txt
Commit 03 — RBAC Persistence Smoke Tests
```
