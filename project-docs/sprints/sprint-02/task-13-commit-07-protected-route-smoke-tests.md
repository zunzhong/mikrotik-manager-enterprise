# Sprint 02 Task 13 Commit 07 — Protected Route Smoke Tests

Adds smoke tests for protected routes.

## File

```txt
tools/smoke-tests/protected-routes-smoke.ps1
```

## Covered protected routes

```txt
GET    /api/v1/audit/export
POST   /api/v1/audit/retention/prune
POST   /api/v1/rbac/users/:userId/roles
DELETE /api/v1/rbac/users/:userId/roles/:roleId
```

## Assertions

```txt
Audit export returns HTTP 403 without RBAC principal
Audit export allows audit:export
Audit retention returns HTTP 403 without RBAC principal
Audit retention denies audit:export-only principal
Audit retention allows audit:prune
RBAC assignment returns HTTP 403 without RBAC principal
RBAC assignment allows rbac:assign
RBAC assignment allows legacy role.write
RBAC removal returns HTTP 403 without RBAC principal
RBAC removal allows rbac:assign
RBAC removal allows legacy role.write
Unprotected read routes still work
```

## Run

Terminal 1:

```powershell
pnpm --filter @mme/server dev
```

Terminal 2:

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/protected-routes-smoke.ps1
```

## Run against custom URL

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/protected-routes-smoke.ps1 `
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
Commit 08 — Auth Guard Context Docs
```
