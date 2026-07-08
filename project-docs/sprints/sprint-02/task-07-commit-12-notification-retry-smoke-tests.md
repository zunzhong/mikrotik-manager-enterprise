# Sprint 02 Task 07 Commit 12 — Notification Retry Smoke Tests

Updates Notification Engine smoke test to cover delivery retry APIs.

## Covered retry APIs

```txt
POST /api/v1/notifications/retry-failed
POST /api/v1/notifications/deliveries/:id/retry
```

## Failure scenario

Use:

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/notification-smoke.ps1 `
  -ForceFailedWebhook
```

This creates a webhook channel with an unreachable URL so the delivery worker can produce a failed delivery for retry testing.

## Check

```powershell
pnpm --filter @mme/server typecheck
pnpm --filter @mme/web typecheck
pnpm build
```
