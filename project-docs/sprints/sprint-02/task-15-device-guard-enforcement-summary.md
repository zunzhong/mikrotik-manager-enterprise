# Sprint 02 Task 15 — Device Guard Enforcement Summary

## Status

```txt
Completed backend enforcement, smoke tests, UI permission helpers, and docs.
```

## Completed commits

```txt
Commit 01 — Device Permission Matrix
Commit 02 — Protect Device Write APIs
Commit 03 — Protect Device Connection/Test API
Commit 04 — Protect Device Inventory Sync APIs
Commit 05 — Protect Device Action APIs
Commit 06 — Device Guard Smoke Tests
Commit 07 — Device Guard UI Permission States
Commit 08 — Device Guard Docs
```

## Hotfixes during task

```txt
Commit 05 Hotfix — Enforce guards on action APIs
```

## Protected backend routes

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

## Permission coverage

```txt
device:manage
device:connect
device:test
device:sync
```

## Read routes intentionally left open

```txt
GET /api/v1/devices
GET /api/v1/devices/:id
GET /api/v1/realtime/devices
GET /api/v1/realtime/scheduler/status
GET /api/v1/realtime/devices/:id
GET /api/v1/realtime/devices/:id/stream
GET /api/v1/devices/:id/realtime
```

## Smoke test

```txt
tools/smoke-tests/device-guard-smoke.ps1
```

Expected final line:

```txt
Device guard smoke test completed.
```

## UI helper module

```txt
apps/web/src/modules/device-guard
```

Exports:

```txt
DevicePermissionGate
DevicePermissionNotice
getDevicePermissionState
devicePermissionLabel
```

## Validation

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm --filter @mme/web typecheck
pnpm build
```

## Current limitation

Device read routes are not guarded yet. This is intentional while the dashboard is still being hardened.

## Recommended next task

```txt
Sprint 02 Task 16 — Alert Guard Enforcement
```

Suggested commits:

```txt
Commit 01 — Alert Permission Matrix
Commit 02 — Protect Alert Lifecycle Write APIs
Commit 03 — Protect Alert Bulk APIs
Commit 04 — Alert Guard Smoke Tests
Commit 05 — Alert Guard UI Permission States
Commit 06 — Alert Guard Docs
```
