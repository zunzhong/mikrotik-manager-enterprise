# Sprint 02 Task 11 Commit 05 — RBAC Startup Seed Smoke Tests

Adds smoke coverage for startup/default RBAC seeding.

## File

```txt
tools/smoke-tests/rbac-startup-seed-smoke.ps1
```

## Covered APIs

```txt
GET  /api/v1/rbac/roles
GET  /api/v1/rbac/roles/owner
GET  /api/v1/rbac/roles/admin
POST /api/v1/rbac/seed-defaults
GET  /api/v1/audit?action=rbac.defaults.seeded
```

## Assertions

```txt
Startup seed creates the five default roles
Each default role appears exactly once
Repeated manual seed is idempotent
Owner wildcard permission remains present
Admin default permissions remain present
Manual seed writes audit events
```

## Run

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/rbac-startup-seed-smoke.ps1
```

## Run without audit verification

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/rbac-startup-seed-smoke.ps1 `
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
Commit 06 — RBAC Permission Guard Foundation
```
