# Sprint 02 Task 07 Commit 03 — Notification Event Bridge

Connects Event Bus to Notification Engine.

## Flow

```txt
AppEvent -> NotificationPayload -> Rule matching -> Delivery queue
```

## Check

```powershell
pnpm --filter @mme/server typecheck
pnpm build
```
