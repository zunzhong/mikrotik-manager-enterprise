# Sprint 02 Task 11 Commit 07 — RBAC Guard Probe Integration

Integrates RBAC permission guard into safe probe endpoints.

## Why probe endpoints first

The project does not yet have a complete auth/session pipeline.

Applying RBAC guard immediately to existing APIs such as notification management or audit export would break the current dashboard because the web app does not yet send an authenticated user principal.

This commit proves the guard works end-to-end without locking existing UI/API flows.

## Files

```txt
apps/server/src/modules/rbac/rbac.routes.ts
tools/http/rbac.http
```

## New endpoints

```txt
GET /api/v1/rbac/guard/probe/audit-export
GET /api/v1/rbac/guard/probe/rbac-manage
```

## Behavior

`audit-export` requires:

```txt
audit:export
```

`rbac-manage` requires:

```txt
rbac:manage
```

## Supported request headers

```txt
x-user-id
x-rbac-roles
x-rbac-permissions
x-rbac-super-admin
```

## Manual test

Terminal 1:

```powershell
pnpm --filter @mme/server dev
```

Terminal 2:

```powershell
Invoke-RestMethod `
  -Method GET `
  -Uri "http://localhost:3000/api/v1/rbac/guard/probe/audit-export" `
  -Headers @{ "x-rbac-roles" = "admin" }
```

Super admin test:

```powershell
Invoke-RestMethod `
  -Method GET `
  -Uri "http://localhost:3000/api/v1/rbac/guard/probe/rbac-manage" `
  -Headers @{ "x-rbac-super-admin" = "true" }
```

Denied test:

```powershell
Invoke-RestMethod `
  -Method GET `
  -Uri "http://localhost:3000/api/v1/rbac/guard/probe/audit-export"
```

Expected denied response:

```txt
HTTP 403
```

## Check

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm build
```

## Next commit

```txt
Commit 08 — RBAC Guard Smoke Tests
```
