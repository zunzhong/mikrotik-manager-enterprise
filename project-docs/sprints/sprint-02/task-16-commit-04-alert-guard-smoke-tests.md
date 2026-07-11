# Sprint 02 Task 16 Commit 04 — Alert Guard Smoke Tests

Adds smoke tests for Alert Guard Enforcement.

## File

```txt
tools/smoke-tests/alert-guard-smoke.ps1
```

## Covered protected routes

```txt
POST /api/v1/alert-lifecycle/:id/acknowledge
POST /api/v1/alert-lifecycle/:id/resolve
POST /api/v1/alert-lifecycle/bulk/acknowledge
POST /api/v1/alert-lifecycle/bulk/resolve
POST /api/v1/alert-lifecycle/device/:deviceId/resolve-active
```

## Assertions

```txt
Read routes remain open
Acknowledge returns HTTP 403 without permission
Acknowledge passes RBAC with alert:acknowledge
Acknowledge passes RBAC with alert:update fallback
Resolve returns HTTP 403 without permission
Resolve passes RBAC with alert:resolve
Resolve passes RBAC with alert:manage fallback
Bulk acknowledge returns HTTP 403 without permission
Bulk acknowledge passes RBAC with alert:bulk
Bulk acknowledge passes RBAC with alert:update fallback
Bulk resolve returns HTTP 403 without permission
Bulk resolve passes RBAC with alert:bulk
Bulk resolve passes RBAC with alert:manage fallback
Device resolve-active returns HTTP 403 without permission
Device resolve-active passes RBAC with alert:resolve
Device resolve-active passes RBAC with alert:bulk
```

## Non-403 handling

Allowed requests may return `404 ALERT_NOT_FOUND` if the smoke alert ID does not exist.

The smoke test treats any non-403 response as proof that the request passed RBAC guard and then failed later in service logic.

## Run

Terminal 1:

```powershell
pnpm --filter @mme/server dev
```

Terminal 2:

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/alert-guard-smoke.ps1
```

## Custom IDs

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/alert-guard-smoke.ps1 `
  -AlertId "real-alert-id" `
  -DeviceId "real-device-id"
```

## Check

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm build
```

## Next commit

```txt
Commit 05 — Alert Guard UI Permission States
```
