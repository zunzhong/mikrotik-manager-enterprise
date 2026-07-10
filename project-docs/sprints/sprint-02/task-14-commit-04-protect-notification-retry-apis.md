# Sprint 02 Task 14 Commit 04 — Protect Notification Retry APIs

Protects notification retry routes with RBAC Guard.

## File

```txt
apps/server/src/modules/notifications/notification.routes.ts
```

## Protected routes

```txt
POST /api/v1/notifications/deliveries/:id/retry
POST /api/v1/notifications/retry-failed
```

Accepted permissions:

```txt
notification:retry
notification:manage
```

## Why `notification:manage` is accepted

Existing seeded roles may only contain:

```txt
notification:manage
```

The new granular permission is:

```txt
notification:retry
```

During the compatibility window, either permission can retry notification deliveries.

## Implementation

```ts
const notificationRetryPreHandler = [
  attachAuthContextPreHandler,
  rbacAnyGuard(
    ['notification:retry', 'notification:manage'] as RbacPermission[],
    'Notification retry permission is required',
  ),
];
```

## Existing protected routes kept

Channel and Rule write routes remain protected by:

```txt
notification:manage
```

## Routes unchanged

These routes remain unchanged in this commit:

```txt
GET  /api/v1/notifications/summary
GET  /api/v1/notifications/channels
GET  /api/v1/notifications/rules
GET  /api/v1/notifications/deliveries
POST /api/v1/notifications/process-pending
POST /api/v1/notifications/test
POST /api/v1/notifications/seed-defaults
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
  -Uri "http://localhost:3000/api/v1/notifications/retry-failed" `
  -ContentType "application/json" `
  -Body '{ "limit": 10 }'
```

Allowed with retry permission:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/notifications/retry-failed" `
  -ContentType "application/json" `
  -Headers @{ "x-rbac-permissions" = "notification:retry" } `
  -Body '{ "limit": 10 }'
```

Allowed with manage fallback:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/notifications/retry-failed" `
  -ContentType "application/json" `
  -Headers @{ "x-rbac-permissions" = "notification:manage" } `
  -Body '{ "limit": 10 }'
```

## Browser dev auth

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'notification:retry');
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
Commit 05 — Protect Notification Test and Process APIs
```
