# Sprint 02 Task 10 Commit 04 — RBAC Smoke Tests

Adds PowerShell smoke tests for RBAC API and Audit Log integration.

## Covered APIs

```txt
GET    /api/v1/rbac/permissions
GET    /api/v1/rbac/roles
GET    /api/v1/rbac/roles/owner
GET    /api/v1/rbac/users/:userId/permissions
GET    /api/v1/rbac/users/:userId/roles
POST   /api/v1/rbac/users/:userId/roles
DELETE /api/v1/rbac/users/:userId/roles/:roleId
POST   /api/v1/rbac/check
GET    /api/v1/audit?action=rbac.user_role.assigned
GET    /api/v1/audit?action=rbac.permission.checked
GET    /api/v1/audit?action=rbac.user_role.removed
```

## Assertions

```txt
Default permissions exist
Default roles exist
Owner has wildcard permission
User can receive roles
User permissions resolve from roles
audit:export is allowed for admin/auditor
audit:export is denied for viewer
isSuperAdmin bypass allows rbac:manage
Role removal works
RBAC activity writes audit events
```

## Run

```powershell
powershell -ExecutionPolicy Bypass -File tools/smoke-tests/rbac-smoke.ps1
```

## Run without audit verification

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/rbac-smoke.ps1 `
  -SkipAuditVerify
```

## Check

```powershell
pnpm --filter @mme/server typecheck
pnpm --filter @mme/web typecheck
pnpm build
```
