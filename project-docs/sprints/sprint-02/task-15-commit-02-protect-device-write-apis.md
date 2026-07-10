# Sprint 02 Task 15 Commit 02 — Protect Device Write APIs

Protects Device write routes with RBAC Guard.

## File

```txt
apps/server/src/modules/device/presentation/device.routes.ts
```

## Protected routes

```txt
POST   /api/v1/devices
PATCH  /api/v1/devices/:id
DELETE /api/v1/devices/:id
```

Required permission:

```txt
device:manage
```

## Implementation

```ts
const deviceManagePreHandler = [attachAuthContextPreHandler, rbacGuard('device:manage')];
```

Applied to:

```ts
app.post('/api/v1/devices', {
  preHandler: deviceManagePreHandler,
});
```

```ts
app.patch('/api/v1/devices/:id', {
  preHandler: deviceManagePreHandler,
});
```

```ts
app.delete('/api/v1/devices/:id', {
  preHandler: deviceManagePreHandler,
});
```

## Routes unchanged

These routes remain unchanged in this commit:

```txt
GET  /api/v1/devices
GET  /api/v1/devices/:id
POST /api/v1/devices/test
```

The connection test route is intentionally left for the next commit.

## Manual tests

Terminal 1:

```powershell
pnpm --filter @mme/server dev
```

Denied without permission:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/devices" `
  -ContentType "application/json" `
  -Body '{ "name": "Denied Device", "host": "192.0.2.10", "port": 8728, "username": "admin", "password": "", "useTls": false, "loginMode": "auto", "tags": ["denied"] }'
```

Allowed with permission:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/devices" `
  -ContentType "application/json" `
  -Headers @{ "x-rbac-permissions" = "device:manage" } `
  -Body '{ "name": "Protected Device", "host": "192.0.2.10", "port": 8728, "username": "admin", "password": "", "useTls": false, "loginMode": "auto", "tags": ["protected"] }'
```

## Browser dev auth

To use the Dashboard locally with device write access, enable:

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
Commit 03 — Protect Device Connection/Test APIs
```
