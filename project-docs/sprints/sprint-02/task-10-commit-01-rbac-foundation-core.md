# Sprint 02 Task 10 Commit 01 — RBAC Foundation Core

Adds the first Enterprise RBAC core module.

## Files

```txt
apps/server/src/modules/rbac/rbac.types.ts
apps/server/src/modules/rbac/rbac.permissions.ts
apps/server/src/modules/rbac/rbac.roles.ts
apps/server/src/modules/rbac/rbac.store.ts
apps/server/src/modules/rbac/rbac.service.ts
apps/server/src/modules/rbac/index.ts
```

## Default roles

```txt
owner
admin
operator
auditor
viewer
```

## Permission examples

```txt
*
dashboard:read
device:read
device:manage
alert:update
notification:manage
audit:read
audit:export
audit:prune
rbac:assign
rbac:manage
```

## Behavior

```txt
Owner has wildcard permission *
Admin can manage operational modules
Operator can operate devices/alerts/notifications
Auditor can view/export audit logs
Viewer is read-only
```

## Next commit

```txt
Commit 02 — RBAC API
```

Recommended APIs:

```txt
GET    /api/v1/rbac/roles
GET    /api/v1/rbac/roles/:id
GET    /api/v1/rbac/users/:userId/permissions
GET    /api/v1/rbac/users/:userId/roles
POST   /api/v1/rbac/users/:userId/roles
DELETE /api/v1/rbac/users/:userId/roles/:roleId
POST   /api/v1/rbac/check
```

## Check

```powershell
pnpm --filter @mme/server typecheck
pnpm build
```
