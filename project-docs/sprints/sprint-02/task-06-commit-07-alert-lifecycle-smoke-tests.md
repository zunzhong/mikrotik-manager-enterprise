# Sprint 02 Task 06 Commit 07 — Alert Lifecycle Smoke Tests

This commit adds a PowerShell smoke test for Alert Lifecycle APIs.

## Covered endpoints

```txt
GET  /api/v1/alert-lifecycle/summary
GET  /api/v1/alert-lifecycle/active
GET  /api/v1/events?limit=20
POST /api/v1/alert-lifecycle/:id/acknowledge
POST /api/v1/alert-lifecycle/:id/resolve
POST /api/v1/alert-lifecycle/device/:deviceId/resolve-active
```

## Usage

```powershell
powershell -ExecutionPolicy Bypass -File tools/smoke-tests/alert-lifecycle-smoke.ps1
```

## Check

```powershell
pnpm --filter @mme/server typecheck
pnpm --filter @mme/web typecheck
pnpm build
```
