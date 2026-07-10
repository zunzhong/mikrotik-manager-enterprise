# Sprint 02 Task 11 Commit 08 — RBAC Guard Smoke Tests

Adds smoke tests for RBAC permission guard probe endpoints.

## File

```txt
tools/smoke-tests/rbac-guard-smoke.ps1
```

## Covered endpoints

```txt
POST /api/v1/rbac/seed-defaults
GET  /api/v1/rbac/guard/probe/audit-export
GET  /api/v1/rbac/guard/probe/rbac-manage
```

## Assertions

```txt
No RBAC headers returns HTTP 403 for audit:export
Admin role allows audit:export
Direct audit:export permission allows audit:export
Admin role does not allow rbac:manage
Owner role allows rbac:manage
Super admin header allows rbac:manage
```

## Run

Terminal 1:

```powershell
pnpm --filter @mme/server dev
```

Terminal 2:

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/rbac-guard-smoke.ps1
```

## Run against custom base URL

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/rbac-guard-smoke.ps1 `
  -BaseUrl "http://localhost:3000"
```

## Check

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm build
```

## Next commit

```txt
Commit 09 — RBAC Guard Docs
```
