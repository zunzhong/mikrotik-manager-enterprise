# Device Guard Enforcement

Device Guard Enforcement protects device write, connection, sync, and action APIs.

## Permission model

| Permission       | Meaning                                                                |
| ---------------- | ---------------------------------------------------------------------- |
| `device:read`    | Read device list, detail, realtime state, and dashboards               |
| `device:manage`  | Create, update, delete, and reboot devices                             |
| `device:connect` | Test RouterOS connection or connection-sensitive probes                |
| `device:sync`    | Trigger realtime refresh, inventory sync, backup, or supout operations |
| `device:test`    | Run safe diagnostics such as ping                                      |

## Backend enforcement

Main backend file:

```txt
apps/server/src/modules/device/presentation/device.routes.ts
```

Foundation files:

```txt
apps/server/src/modules/auth/auth.context.ts
apps/server/src/modules/auth/auth.context.middleware.ts
apps/server/src/modules/rbac/rbac.guard.ts
```

## Protected route groups

Device write routes require:

```txt
device:manage
```

Connection and ping routes accept:

```txt
device:connect
device:test
device:manage
```

Sync, backup, and supout routes accept:

```txt
device:sync
device:manage
```

Reboot requires:

```txt
device:manage
```

## Frontend permission state

Main frontend module:

```txt
apps/web/src/modules/device-guard
```

Exports:

```txt
getDevicePermissionState()
DevicePermissionGate
DevicePermissionNotice
devicePermissionLabel()
```

UI action mapping:

```txt
read    -> device:read or device:manage or dashboard:read
manage  -> device:manage
connect -> device:connect or device:test or device:manage
sync    -> device:sync or device:manage
test    -> device:test or device:connect or device:manage
ping    -> device:test or device:connect or device:manage
backup  -> device:sync or device:manage
supout  -> device:sync or device:manage
reboot  -> device:manage
```

## Browser development test

Read-only device user:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'device:read');
location.reload();
```

Device manager:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'device:read,device:manage');
location.reload();
```

Device sync/test user:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'device:read,device:sync,device:test');
location.reload();
```

## Smoke tests

```powershell
pnpm --filter @mme/server dev
```

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/device-guard-smoke.ps1
```

## Reboot safety

The smoke test intentionally does not execute the allowed reboot path.

It only verifies that reboot is blocked without permission to avoid accidentally rebooting a real
RouterOS device.

## Rollback guide

If a protected route breaks a dashboard flow, remove only the route-level `preHandler`.

Keep these files:

```txt
auth.context.ts
auth.context.middleware.ts
rbac.guard.ts
device-guard UI module
smoke tests
docs
```

## Production hardening

Local dev headers are useful for development and smoke tests.

Production should resolve permissions from a trusted server-side source:

```txt
Server-side session
Signed access token
API key mapped to service principal
Internal worker/service identity
```
