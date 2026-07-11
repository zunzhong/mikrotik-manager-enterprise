# Sprint 02 Task 15 Commit 04 — Protect Device Inventory Sync APIs

Protects Device realtime refresh and scheduler routes with RBAC Guard.

## File

```txt
apps/server/src/modules/device/presentation/device.routes.ts
```

## Protected routes

```txt
POST /api/v1/realtime/scheduler/start
POST /api/v1/realtime/scheduler/stop
POST /api/v1/realtime/devices/:id/refresh
POST /api/v1/devices/:id/realtime/refresh
```

Accepted permissions:

```txt
device:sync
device:manage
```

## Why `device:manage` is accepted

Existing seeded roles may only contain:

```txt
device:manage
```

The new granular permission is:

```txt
device:sync
```

During the compatibility window, `device:manage` remains a fallback.

## Implementation

```ts
const deviceSyncPreHandler = [
  attachAuthContextPreHandler,
  rbacAnyGuard(
    ['device:sync', 'device:manage'] as RbacPermission[],
    'Device sync permission is required',
  ),
];
```

## Existing protected routes kept

Device write routes remain protected by:

```txt
device:manage
```

Device connection test remains protected by:

```txt
device:connect
device:test
device:manage
```

## Routes unchanged

These routes remain unchanged in this commit:

```txt
GET  /api/v1/devices
GET  /api/v1/devices/:id
GET  /api/v1/realtime/devices
GET  /api/v1/realtime/scheduler/status
GET  /api/v1/realtime/devices/:id
GET  /api/v1/realtime/devices/:id/stream
GET  /api/v1/devices/:id/realtime
POST /api/v1/devices/:id/actions/ping
POST /api/v1/devices/:id/actions/backup
POST /api/v1/devices/:id/actions/supout
POST /api/v1/devices/:id/actions/reboot
```

Device action routes are intentionally left for a later commit.

## Manual tests

Terminal 1:

```powershell
pnpm --filter @mme/server dev
```

Denied without permission:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/realtime/scheduler/start" `
  -ContentType "application/json" `
  -Body '{ "intervalMs": 30000, "ttlMs": 60000 }'
```

Allowed with sync permission:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/realtime/scheduler/start" `
  -ContentType "application/json" `
  -Headers @{ "x-rbac-permissions" = "device:sync" } `
  -Body '{ "intervalMs": 30000, "ttlMs": 60000 }'
```

Allowed with manage fallback:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/realtime/scheduler/start" `
  -ContentType "application/json" `
  -Headers @{ "x-rbac-permissions" = "device:manage" } `
  -Body '{ "intervalMs": 30000, "ttlMs": 60000 }'
```

## Browser dev auth

Sync user:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'device:read,device:sync');
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
Commit 05 — Protect Device Action APIs
```
