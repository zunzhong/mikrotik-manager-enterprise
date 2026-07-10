# Sprint 02 Task 14 Commit 03 — Protect Notification Rule Write APIs

Protects Notification Rule write routes with RBAC Guard.

## File

```txt
apps/server/src/modules/notifications/notification.routes.ts
```

## Protected routes

```txt
POST   /api/v1/notifications/rules
PATCH  /api/v1/notifications/rules/:id
DELETE /api/v1/notifications/rules/:id
```

Required permission:

```txt
notification:manage
```

## Existing protected routes kept

Channel write routes remain protected from the previous commit:

```txt
POST   /api/v1/notifications/channels
PATCH  /api/v1/notifications/channels/:id
DELETE /api/v1/notifications/channels/:id
```

## Implementation

Rule write routes reuse:

```ts
const notificationManagePreHandler = [
  attachAuthContextPreHandler,
  rbacGuard('notification:manage'),
];
```

## Routes unchanged

These routes remain unchanged in this commit:

```txt
GET  /api/v1/notifications/summary
GET  /api/v1/notifications/channels
GET  /api/v1/notifications/rules
Delivery routes
Retry routes
Test routes
Seed routes
```

## Manual tests

Terminal 1:

```powershell
pnpm --filter @mme/server dev
```

Denied without permission:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/notifications/rules" `
  -ContentType "application/json" `
  -Body '{ "name": "Denied Rule", "enabled": true, "eventTypes": ["SYSTEM_EVENT"], "severities": ["info"], "channelIds": ["demo-channel"] }'
```

Allowed with permission:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/notifications/rules" `
  -ContentType "application/json" `
  -Headers @{ "x-rbac-permissions" = "notification:manage" } `
  -Body '{ "name": "Protected Rule", "enabled": true, "eventTypes": ["SYSTEM_EVENT"], "severities": ["info"], "channelIds": ["demo-channel"] }'
```

## Browser dev auth

To use the Dashboard locally, enable:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'notification:manage');
location.reload();
```

## Check

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm build
```

## Next commit

```txt
Commit 04 — Protect Notification Retry APIs
```
