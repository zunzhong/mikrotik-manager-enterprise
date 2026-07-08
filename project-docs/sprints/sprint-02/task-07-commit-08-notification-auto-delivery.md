# Sprint 02 Task 07 Commit 08 — Notification Auto Delivery

Automatically processes notification deliveries after Event Bus events are enqueued.

## Flow

```txt
AppEvent -> NotificationPayload -> Delivery queue -> Delivery worker
```

## Check

```powershell
pnpm --filter @mme/server typecheck
pnpm build
```
