# Sprint 02 Task 13 Commit 06 — Protect RBAC Assignment API

Protects user role assignment and removal APIs with RBAC guard.

## Files

```txt
apps/server/src/modules/rbac/rbac.guard.ts
apps/server/src/modules/rbac/rbac.routes.ts
tools/http/rbac-assignment-protected.http
```

## Protected routes

```txt
POST   /api/v1/rbac/users/:userId/roles
DELETE /api/v1/rbac/users/:userId/roles/:roleId
```

## Accepted permissions

```txt
rbac:assign
role.write
```

## Why both permissions are accepted

The Enterprise RBAC plan uses:

```txt
rbac:assign
```

Some existing project data or older seed defaults may still use:

```txt
role.write
```

This commit adds `rbacAnyGuard()` so the protected assignment routes work with either permission while the permission catalog is being normalized.

## Guard implementation

```ts
preHandler: [
  attachAuthContextPreHandler,
  rbacAnyGuard(
    ['rbac:assign', 'role.write'] as RbacPermission[],
    'RBAC role assignment permission is required',
  ),
];
```

## New guard helper

```txt
requireAnyRbacPermission()
createAnyRbacPreHandler()
rbacAnyGuard()
```

## Manual tests

Terminal 1:

```powershell
pnpm --filter @mme/server dev
```

Denied without permission:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/rbac/users/protected-test-user/roles" `
  -ContentType "application/json" `
  -Body '{ "roleId": "viewer", "assignedBy": "protected-smoke" }'
```

Allowed with `rbac:assign`:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/rbac/users/protected-test-user/roles" `
  -ContentType "application/json" `
  -Headers @{ "x-rbac-permissions" = "rbac:assign" } `
  -Body '{ "roleId": "viewer", "assignedBy": "protected-smoke" }'
```

Allowed with `role.write`:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/rbac/users/protected-test-user/roles" `
  -ContentType "application/json" `
  -Headers @{ "x-rbac-permissions" = "role.write" } `
  -Body '{ "roleId": "auditor", "assignedBy": "protected-smoke" }'
```

## Check

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm build
```

## Next commit

```txt
Commit 07 — Protected Route Smoke Tests
```
