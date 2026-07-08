# Sprint 02 Task 07 Commit 10 — Notification Retry Backend

Adds retry support for notification deliveries.

## New APIs

```txt
POST /api/v1/notifications/deliveries/:id/retry
POST /api/v1/notifications/retry-failed
```

## Check

```powershell
pnpm --filter @mme/server typecheck
pnpm build
```
