# Sprint 02 Task 11 Commit 03 — RBAC Persistence Smoke Tests

Adds a dedicated smoke test for Prisma-backed RBAC persistence.

## File

```txt
tools/smoke-tests/rbac-persistence-smoke.ps1
```

## Covered APIs

```txt
GET    /api/v1/rbac/roles
GET    /api/v1/rbac/roles/admin
POST   /api/v1/rbac/users/:userId/roles
GET    /api/v1/rbac/users/:userId/roles
GET    /api/v1/rbac/users/:userId/permissions
POST   /api/v1/rbac/check
DELETE /api/v1/rbac/users/:userId/roles/:roleId
GET    /api/v1/audit?action=rbac.user_role.assigned
GET    /api/v1/audit?action=rbac.permission.checked
GET    /api/v1/audit?action=rbac.user_role.removed
```

## Assertions

```txt
Default RBAC roles exist
Admin role permissions are loaded
User role assignment persists
Duplicate assignment does not create duplicate role entries
Effective permissions are resolved from stored roles
Permission allow/deny checks work
Role removal persists
RBAC audit events are written
```

## Run

```powershell
powershell -ExecutionPolicy Bypass -File tools/smoke-tests/rbac-persistence-smoke.ps1
```

## Run with custom smoke user

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/rbac-persistence-smoke.ps1 `
  -UserId "rbac-persistence-demo"
```

## Run without audit verification

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/rbac-persistence-smoke.ps1 `
  -SkipAuditVerify
```

## Check

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm build
```

## Next commit

```txt
Commit 04 — RBAC Startup Seed
```
