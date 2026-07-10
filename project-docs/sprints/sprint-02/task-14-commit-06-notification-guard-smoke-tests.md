# Sprint 02 Task 14 Commit 06 — Notification Guard Smoke Tests

Adds smoke tests for Notification Guard Enforcement.

## File

```txt
tools/smoke-tests/notification-guard-smoke.ps1
```

## Covered protected routes

```txt
POST   /api/v1/notifications/channels
PATCH  /api/v1/notifications/channels/:id
DELETE /api/v1/notifications/channels/:id
POST   /api/v1/notifications/rules
PATCH  /api/v1/notifications/rules/:id
DELETE /api/v1/notifications/rules/:id
POST   /api/v1/notifications/retry-failed
POST   /api/v1/notifications/process-pending
POST   /api/v1/notifications/test
```

## Assertions

```txt
Read routes remain open
Channel write routes return HTTP 403 without permission
Channel write routes allow notification:manage
Rule write routes return HTTP 403 without permission
Rule write routes allow notification:manage
Retry failed returns HTTP 403 without permission
Retry failed allows notification:retry
Retry failed allows notification:manage fallback
Process pending returns HTTP 403 without permission
Process pending allows notification:send
Process pending allows notification:manage fallback
Notification test returns HTTP 403 without permission
Notification test allows notification:test
Notification test allows notification:manage fallback
Smoke-created rule/channel are cleaned up
```

## Run

Terminal 1:

```powershell
pnpm --filter @mme/server dev
```

Terminal 2:

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/notification-guard-smoke.ps1
```

## Custom base URL

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/notification-guard-smoke.ps1 `
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
Commit 07 — Notification Guard UI Permission States
```
