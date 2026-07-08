# Sprint 02 Task 07 Commit 13 — Notification Management Backend

Adds backend APIs to update/delete notification channels and rules.

## New APIs

```txt
PATCH  /api/v1/notifications/channels/:id
DELETE /api/v1/notifications/channels/:id
PATCH  /api/v1/notifications/rules/:id
DELETE /api/v1/notifications/rules/:id
```

## Check

```powershell
pnpm --filter @mme/server typecheck
pnpm build
```
