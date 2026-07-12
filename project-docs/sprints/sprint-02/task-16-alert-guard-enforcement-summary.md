# Sprint 02 Task 16 — Alert Guard Enforcement Summary

## Status

```txt
Completed backend enforcement, smoke tests, UI permission helpers, and docs.
```

## Completed commits

```txt
Commit 01 — Alert Permission Matrix
Commit 02 — Protect Alert Lifecycle Write APIs
Commit 03 — Protect Alert Bulk APIs
Commit 04 — Alert Guard Smoke Tests
Commit 05 — Alert Guard UI Permission States
Commit 06 — Alert Guard Docs
```

## Protected backend routes

```txt
POST /api/v1/alert-lifecycle/:id/acknowledge
POST /api/v1/alert-lifecycle/:id/resolve
POST /api/v1/alert-lifecycle/bulk/acknowledge
POST /api/v1/alert-lifecycle/bulk/resolve
POST /api/v1/alert-lifecycle/device/:deviceId/resolve-active
```

## Permission coverage

```txt
alert:acknowledge
alert:resolve
alert:update
alert:bulk
alert:manage
```

## Read routes intentionally left open

```txt
GET /api/v1/alert-lifecycle/summary
GET /api/v1/alert-lifecycle
GET /api/v1/alert-lifecycle/active
GET /api/v1/alert-lifecycle/:id
```

## Smoke test

```txt
tools/smoke-tests/alert-guard-smoke.ps1
```

Run:

```powershell
pnpm --filter @mme/server dev
```

Then:

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/alert-guard-smoke.ps1
```

Expected final line:

```txt
Alert guard smoke test completed.
```

## UI helper module

```txt
apps/web/src/modules/alert-guard
```

Exports:

```txt
AlertPermissionGate
AlertPermissionNotice
getAlertPermissionState
alertPermissionLabel
```

## Validation

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm --filter @mme/web typecheck
pnpm build
```

## Current limitation

Alert read routes are not guarded yet.

This is intentional while the dashboard is still being hardened.

## Recommended next task

```txt
Sprint 02 Task 17 — Read Route Guard Rollout
```

Suggested commits:

```txt
Commit 01 — Read Guard Permission Matrix
Commit 02 — Protect Audit Read APIs
Commit 03 — Protect Notification Read APIs
Commit 04 — Protect Device Read APIs
Commit 05 — Protect Alert Read APIs
Commit 06 — Read Guard Smoke Tests
Commit 07 — Read Guard Docs
```

## Alternative next task

```txt
Sprint 02 Task 17 — Auth Login UI Foundation
```

Choose this if the next priority is replacing development headers with real login/session UX.
