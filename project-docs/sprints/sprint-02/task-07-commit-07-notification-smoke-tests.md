# Sprint 02 Task 07 Commit 07 — Notification Smoke Tests

Adds a PowerShell smoke test for Notification Engine APIs.

## Covered endpoints

```txt
POST /api/v1/notifications/seed-defaults
GET  /api/v1/notifications/channels
GET  /api/v1/notifications/rules
POST /api/v1/notifications/test
POST /api/v1/notifications/process-pending
GET  /api/v1/notifications/summary
GET  /api/v1/notifications/deliveries
```

## Webhook mode

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/notification-smoke.ps1 `
  -CreateWebhookChannel `
  -WebhookUrl "http://localhost:5678/webhook/mme"
```

## Check

```powershell
pnpm --filter @mme/server typecheck
pnpm --filter @mme/web typecheck
pnpm build
```
