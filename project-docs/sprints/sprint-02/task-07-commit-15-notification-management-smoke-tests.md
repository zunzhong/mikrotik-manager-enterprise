# Sprint 02 Task 07 Commit 15 — Notification Management Smoke Tests

Covers channel/rule management APIs in the Notification Engine smoke test.

## Covered APIs

```txt
PATCH  /api/v1/notifications/channels/:id
DELETE /api/v1/notifications/channels/:id
PATCH  /api/v1/notifications/rules/:id
DELETE /api/v1/notifications/rules/:id
```

## Check

```powershell
pnpm --filter @mme/server typecheck
pnpm --filter @mme/web typecheck
pnpm build
```
