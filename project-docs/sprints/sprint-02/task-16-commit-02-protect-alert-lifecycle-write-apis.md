# Sprint 02 Task 16 Commit 02 — Protect Alert Lifecycle Write APIs

Protects single-alert lifecycle write routes with RBAC Guard.

## File

```txt
apps/server/src/modules/alert-lifecycle/alert-lifecycle.routes.ts
```

## Protected routes

```txt
POST /api/v1/alert-lifecycle/:id/acknowledge
POST /api/v1/alert-lifecycle/:id/resolve
```

## Accepted permissions

Acknowledge accepts:

```txt
alert:acknowledge
alert:update
alert:manage
```

Resolve accepts:

```txt
alert:resolve
alert:update
alert:manage
```

## Why `alert:update` is accepted

Existing seeded roles may only contain:

```txt
alert:update
```

The new granular permissions are:

```txt
alert:acknowledge
alert:resolve
```

During the compatibility window, `alert:update` remains a fallback.

## Implementation

```ts
const alertAcknowledgePreHandler = [
  attachAuthContextPreHandler,
  rbacAnyGuard(
    ['alert:acknowledge', 'alert:update', 'alert:manage'] as RbacPermission[],
    'Alert acknowledge permission is required',
  ),
];
```

```ts
const alertResolvePreHandler = [
  attachAuthContextPreHandler,
  rbacAnyGuard(
    ['alert:resolve', 'alert:update', 'alert:manage'] as RbacPermission[],
    'Alert resolve permission is required',
  ),
];
```

## Routes unchanged

These routes remain unchanged in this commit:

```txt
GET  /api/v1/alert-lifecycle/summary
GET  /api/v1/alert-lifecycle
GET  /api/v1/alert-lifecycle/active
GET  /api/v1/alert-lifecycle/:id
POST /api/v1/alert-lifecycle/bulk/acknowledge
POST /api/v1/alert-lifecycle/bulk/resolve
POST /api/v1/alert-lifecycle/device/:deviceId/resolve-active
```

Bulk and device-wide lifecycle routes are intentionally left for the next commit.

## Manual tests

Terminal 1:

```powershell
pnpm --filter @mme/server dev
```

Denied without permission:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/alert-lifecycle/demo-alert/acknowledge" `
  -ContentType "application/json" `
  -Body '{ "reason": "Denied acknowledge" }'
```

Allowed with acknowledge permission:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/alert-lifecycle/demo-alert/acknowledge" `
  -ContentType "application/json" `
  -Headers @{ "x-rbac-permissions" = "alert:acknowledge" } `
  -Body '{ "reason": "Protected acknowledge" }'
```

Allowed with update fallback:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/alert-lifecycle/demo-alert/acknowledge" `
  -ContentType "application/json" `
  -Headers @{ "x-rbac-permissions" = "alert:update" } `
  -Body '{ "reason": "Protected acknowledge via update fallback" }'
```

If the alert ID does not exist, the allowed request may return `404 ALERT_NOT_FOUND`.

That is acceptable for this guard test because it means RBAC passed and the service rejected the missing alert.

## Browser dev auth

Alert lifecycle user:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'alert:read,alert:update');
location.reload();
```

Alert manager:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'alert:read,alert:manage');
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
Commit 03 — Protect Alert Bulk APIs
```
