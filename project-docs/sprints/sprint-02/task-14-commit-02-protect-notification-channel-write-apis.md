# Sprint 02 Task 14 Commit 02 — Protect Notification Channel Write APIs

Protects Notification Channel write routes with RBAC Guard.

## File

```txt
apps/server/src/modules/notifications/notification.routes.ts
```

## Protected routes

```txt
POST   /api/v1/notifications/channels
PATCH  /api/v1/notifications/channels/:id
DELETE /api/v1/notifications/channels/:id
```

Required permission:

```txt
notification:manage
```

## Implementation

```ts
const notificationManagePreHandler = [
  attachAuthContextPreHandler,
  rbacGuard('notification:manage'),
];
```

Applied to:

```ts
app.post('/api/v1/notifications/channels', {
  preHandler: notificationManagePreHandler,
});
```

```ts
app.patch('/api/v1/notifications/channels/:id', {
  preHandler: notificationManagePreHandler,
});
```

```ts
app.delete('/api/v1/notifications/channels/:id', {
  preHandler: notificationManagePreHandler,
});
```

## Routes unchanged

These routes remain unchanged in this commit:

```txt
GET  /api/v1/notifications/summary
GET  /api/v1/notifications/channels
Rule routes
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
  -Uri "http://localhost:3000/api/v1/notifications/channels" `
  -ContentType "application/json" `
  -Body '{ "name": "Denied Webhook", "type": "webhook", "enabled": true, "config": { "url": "https://example.local/denied" } }'
```

Allowed with permission:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/notifications/channels" `
  -ContentType "application/json" `
  -Headers @{ "x-rbac-permissions" = "notification:manage" } `
  -Body '{ "name": "Protected Webhook", "type": "webhook", "enabled": true, "config": { "url": "https://example.local/webhook" } }'
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
Commit 03 — Protect Notification Rule Write APIs
```
