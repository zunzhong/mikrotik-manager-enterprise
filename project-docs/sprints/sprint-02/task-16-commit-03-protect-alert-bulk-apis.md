# Sprint 02 Task 16 Commit 03 — Protect Alert Bulk APIs

Protects bulk alert lifecycle routes with RBAC Guard.

## File

```txt
apps/server/src/modules/alert-lifecycle/alert-lifecycle.routes.ts
```

## Protected routes

```txt
POST /api/v1/alert-lifecycle/bulk/acknowledge
POST /api/v1/alert-lifecycle/bulk/resolve
POST /api/v1/alert-lifecycle/device/:deviceId/resolve-active
```

## Accepted permissions

Bulk acknowledge and bulk resolve accept:

```txt
alert:bulk
alert:update
alert:manage
```

Device resolve-active accepts:

```txt
alert:bulk
alert:resolve
alert:update
alert:manage
```

## Why `alert:update` is accepted

Existing seeded roles may only contain:

```txt
alert:update
```

During the compatibility window, `alert:update` remains a fallback for lifecycle and bulk operations.

## Implementation

```ts
const alertBulkPreHandler = [
  attachAuthContextPreHandler,
  rbacAnyGuard(
    ['alert:bulk', 'alert:update', 'alert:manage'] as RbacPermission[],
    'Alert bulk permission is required',
  ),
];
```

```ts
const alertDeviceBulkResolvePreHandler = [
  attachAuthContextPreHandler,
  rbacAnyGuard(
    ['alert:bulk', 'alert:resolve', 'alert:update', 'alert:manage'] as RbacPermission[],
    'Alert device bulk resolve permission is required',
  ),
];
```

## Existing protected routes kept

Single alert lifecycle routes remain protected:

```txt
POST /api/v1/alert-lifecycle/:id/acknowledge
POST /api/v1/alert-lifecycle/:id/resolve
```

## Routes unchanged

These routes remain unchanged in this commit:

```txt
GET /api/v1/alert-lifecycle/summary
GET /api/v1/alert-lifecycle
GET /api/v1/alert-lifecycle/active
GET /api/v1/alert-lifecycle/:id
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
  -Uri "http://localhost:3000/api/v1/alert-lifecycle/bulk/acknowledge" `
  -ContentType "application/json" `
  -Body '{ "alertIds": ["demo-alert"], "reason": "Denied bulk acknowledge" }'
```

Allowed with bulk permission:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/alert-lifecycle/bulk/acknowledge" `
  -ContentType "application/json" `
  -Headers @{ "x-rbac-permissions" = "alert:bulk" } `
  -Body '{ "alertIds": ["demo-alert"], "reason": "Protected bulk acknowledge" }'
```

Allowed with update fallback:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/alert-lifecycle/bulk/resolve" `
  -ContentType "application/json" `
  -Headers @{ "x-rbac-permissions" = "alert:update" } `
  -Body '{ "alertIds": ["demo-alert"], "reason": "Protected bulk resolve" }'
```

If the alert ID does not exist, the allowed request may return an empty result or a non-403 service response.

That is acceptable for this guard test because it means RBAC passed and the service handled the missing alert data.

## Browser dev auth

Alert bulk user:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'alert:read,alert:bulk');
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
Commit 04 — Alert Guard Smoke Tests
```
