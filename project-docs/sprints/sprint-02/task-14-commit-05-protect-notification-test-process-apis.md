# Sprint 02 Task 14 Commit 05 — Protect Notification Test and Process APIs

Protects notification test and process/send routes with RBAC Guard.

## File

```txt
apps/server/src/modules/notifications/notification.routes.ts
```

## Protected routes

```txt
POST /api/v1/notifications/process-pending
POST /api/v1/notifications/test
```

## Accepted permissions

Process pending accepts:

```txt
notification:send
notification:manage
```

Notification test accepts:

```txt
notification:test
notification:manage
```

## Existing protected routes kept

Channel write routes, rule write routes, and retry routes remain protected.

## Routes unchanged

```txt
GET  /api/v1/notifications/summary
GET  /api/v1/notifications/channels
GET  /api/v1/notifications/rules
GET  /api/v1/notifications/deliveries
POST /api/v1/notifications/seed-defaults
```

## Manual tests

Terminal 1:

```powershell
pnpm --filter @mme/server dev
```

Test notification allowed:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/notifications/test" `
  -ContentType "application/json" `
  -Headers @{ "x-rbac-permissions" = "notification:test" } `
  -Body '{ "eventType": "SYSTEM_EVENT", "severity": "info", "title": "Protected Test", "message": "Protected notification test" }'
```

Process pending allowed:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/notifications/process-pending" `
  -ContentType "application/json" `
  -Headers @{ "x-rbac-permissions" = "notification:send" } `
  -Body '{ "limit": 10 }'
```

## Check

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm build
```

## Next commit

```txt
Commit 06 — Notification Guard Smoke Tests
```
