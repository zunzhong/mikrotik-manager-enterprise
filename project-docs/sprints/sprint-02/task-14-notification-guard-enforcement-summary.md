# Sprint 02 Task 14 — Notification Guard Enforcement Summary

## Status

```txt
Completed backend enforcement, smoke tests, UI permission helpers, and docs.
```

## Completed commits

```txt
Commit 01 — Notification Permission Matrix
Commit 02 — Protect Notification Channel Write APIs
Commit 03 — Protect Notification Rule Write APIs
Commit 04 — Protect Notification Retry APIs
Commit 05 — Protect Notification Test and Process APIs
Commit 06 — Notification Guard Smoke Tests
Commit 07 — Notification Guard UI Permission States
Commit 08 — Notification Guard Docs
```

## Protected backend routes

```txt
POST   /api/v1/notifications/channels
PATCH  /api/v1/notifications/channels/:id
DELETE /api/v1/notifications/channels/:id
POST   /api/v1/notifications/rules
PATCH  /api/v1/notifications/rules/:id
DELETE /api/v1/notifications/rules/:id
POST   /api/v1/notifications/deliveries/:id/retry
POST   /api/v1/notifications/retry-failed
POST   /api/v1/notifications/process-pending
POST   /api/v1/notifications/test
```

## Permission coverage

```txt
notification:manage
notification:retry
notification:test
notification:send
```

## Read routes intentionally left open

```txt
GET  /api/v1/notifications/summary
GET  /api/v1/notifications/channels
GET  /api/v1/notifications/rules
GET  /api/v1/notifications/deliveries
POST /api/v1/notifications/seed-defaults
```

## Smoke test

```txt
tools/smoke-tests/notification-guard-smoke.ps1
```

Run:

```powershell
pnpm --filter @mme/server dev
```

Then:

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/notification-guard-smoke.ps1
```

## UI helper module

```txt
apps/web/src/modules/notification-guard
```

Exports:

```txt
NotificationPermissionGate
NotificationPermissionNotice
getNotificationPermissionState
notificationPermissionLabel
```

## Validation

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm --filter @mme/web typecheck
pnpm build
```

## Current limitation

Notification read routes are not guarded yet.

This is intentional while the dashboard is still being hardened.

## Recommended next task

```txt
Sprint 02 Task 15 — Device Guard Enforcement
```

Suggested commits:

```txt
Commit 01 — Device Permission Matrix
Commit 02 — Protect Device Write APIs
Commit 03 — Protect Device Connection/Test APIs
Commit 04 — Protect Device Inventory Sync APIs
Commit 05 — Device Guard Smoke Tests
Commit 06 — Device Guard UI Permission States
Commit 07 — Device Guard Docs
```

## Alternative next task

```txt
Sprint 02 Task 15 — Auth Login UI Foundation
```

Choose this if the next priority is replacing development headers with real login/session UX.
