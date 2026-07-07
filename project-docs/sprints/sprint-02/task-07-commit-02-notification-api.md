# Sprint 02 Task 07 Commit 02 — Notification API

Adds REST APIs for Notification Engine.

## Endpoints

```txt
GET  /api/v1/notifications/channels
POST /api/v1/notifications/channels
GET  /api/v1/notifications/rules
POST /api/v1/notifications/rules
GET  /api/v1/notifications/deliveries
POST /api/v1/notifications/seed-defaults
POST /api/v1/notifications/test
```

## Check

```powershell
pnpm --filter @mme/server typecheck
pnpm build
```
