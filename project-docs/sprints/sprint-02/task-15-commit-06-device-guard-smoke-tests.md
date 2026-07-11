# Sprint 02 Task 15 Commit 06 — Device Guard Smoke Tests

Adds smoke tests for Device Guard Enforcement.

## File

```txt
tools/smoke-tests/device-guard-smoke.ps1
```

## Covered protected routes

```txt
POST   /api/v1/devices
PATCH  /api/v1/devices/:id
DELETE /api/v1/devices/:id
POST   /api/v1/devices/test
POST   /api/v1/realtime/scheduler/start
POST   /api/v1/realtime/scheduler/stop
POST   /api/v1/realtime/devices/:id/refresh
POST   /api/v1/devices/:id/realtime/refresh
POST   /api/v1/devices/:id/actions/ping
POST   /api/v1/devices/:id/actions/backup
POST   /api/v1/devices/:id/actions/supout
POST   /api/v1/devices/:id/actions/reboot
```

## Reboot safety

The script intentionally does not run the allowed reboot path.

It only checks that reboot is denied without permission.

## Non-403 handling

Some allowed requests may fail after RBAC if the smoke device is not reachable.

The smoke test treats non-403 errors as proof that the request passed the guard and failed later in device or RouterOS service logic.

## Run

Terminal 1:

```powershell
pnpm --filter @mme/server dev
```

Terminal 2:

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/device-guard-smoke.ps1
```

## Custom base URL

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/device-guard-smoke.ps1 `
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
Commit 07 — Device Guard UI Permission States
```
