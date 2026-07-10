# Sprint 02 Task 15 Commit 03 — Protect Device Connection/Test API

Protects the RouterOS device connection test API with RBAC Guard.

## File

```txt
apps/server/src/modules/device/presentation/device.routes.ts
```

## Protected route

```txt
POST /api/v1/devices/test
```

Accepted permissions:

```txt
device:connect
device:test
device:manage
```

## Why `device:manage` is accepted

Existing seeded roles may only contain:

```txt
device:manage
```

The new granular permissions are:

```txt
device:connect
device:test
```

During the compatibility window, `device:manage` remains a fallback.

## Implementation

```ts
const deviceConnectionTestPreHandler = [
  attachAuthContextPreHandler,
  rbacAnyGuard(
    ['device:connect', 'device:test', 'device:manage'] as RbacPermission[],
    'Device connection test permission is required',
  ),
];
```

## Existing protected routes kept

Device write routes remain protected by:

```txt
device:manage
```

```txt
POST   /api/v1/devices
PATCH  /api/v1/devices/:id
DELETE /api/v1/devices/:id
```

## Routes unchanged

These routes remain unchanged in this commit:

```txt
GET /api/v1/devices
GET /api/v1/devices/:id
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
  -Uri "http://localhost:3000/api/v1/devices/test" `
  -ContentType "application/json" `
  -Body '{ "host": "192.0.2.10", "port": 8728, "username": "admin", "password": "", "useTls": false, "loginMode": "auto", "timeoutMs": 1000 }'
```

Allowed with connect permission:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/devices/test" `
  -ContentType "application/json" `
  -Headers @{ "x-rbac-permissions" = "device:connect" } `
  -Body '{ "host": "192.0.2.10", "port": 8728, "username": "admin", "password": "", "useTls": false, "loginMode": "auto", "timeoutMs": 1000 }'
```

Allowed with manage fallback:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/devices/test" `
  -ContentType "application/json" `
  -Headers @{ "x-rbac-permissions" = "device:manage" } `
  -Body '{ "host": "192.0.2.10", "port": 8728, "username": "admin", "password": "", "useTls": false, "loginMode": "auto", "timeoutMs": 1000 }'
```

## Browser dev auth

Connection-test user:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'device:read,device:connect');
location.reload();
```

Device manager user:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'device:read,device:manage');
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
Commit 04 — Protect Device Inventory Sync APIs
```
