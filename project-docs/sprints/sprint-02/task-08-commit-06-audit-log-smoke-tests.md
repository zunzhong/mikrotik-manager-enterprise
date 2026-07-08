# Sprint 02 Task 08 Commit 06 — Audit Log Smoke Tests

Adds PowerShell smoke tests for Audit Log Engine APIs and notification audit integration.

## Covered APIs

```txt
POST /api/v1/audit/seed-demo
POST /api/v1/audit
GET  /api/v1/audit/:id
GET  /api/v1/audit/summary
GET  /api/v1/audit
POST /api/v1/notifications/seed-defaults
```

## Run

```powershell
powershell -ExecutionPolicy Bypass -File tools/smoke-tests/audit-log-smoke.ps1
```

## Skip notification integration

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/audit-log-smoke.ps1 `
  -SkipNotificationIntegration
```

## Check

```powershell
pnpm --filter @mme/server typecheck
pnpm --filter @mme/web typecheck
pnpm build
```
