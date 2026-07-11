# Device Guard API

This document lists Device Engine APIs protected by Auth Context + RBAC Guard.

## Guard pattern

Single permission guard:

```ts
preHandler: [attachAuthContextPreHandler, rbacGuard('device:manage')];
```

Compatibility guard:

```ts
preHandler: [
  attachAuthContextPreHandler,
  rbacAnyGuard(
    ['device:connect', 'device:test', 'device:manage'] as RbacPermission[],
    'Device connection test permission is required',
  ),
];
```

## Protected routes

| Area                   | Method   | Route                                  | Required permission                                  |
| ---------------------- | -------- | -------------------------------------- | ---------------------------------------------------- |
| Device create          | `POST`   | `/api/v1/devices`                      | `device:manage`                                      |
| Device update          | `PATCH`  | `/api/v1/devices/:id`                  | `device:manage`                                      |
| Device delete          | `DELETE` | `/api/v1/devices/:id`                  | `device:manage`                                      |
| Connection test        | `POST`   | `/api/v1/devices/test`                 | `device:connect` or `device:test` or `device:manage` |
| Scheduler start        | `POST`   | `/api/v1/realtime/scheduler/start`     | `device:sync` or `device:manage`                     |
| Scheduler stop         | `POST`   | `/api/v1/realtime/scheduler/stop`      | `device:sync` or `device:manage`                     |
| Realtime refresh       | `POST`   | `/api/v1/realtime/devices/:id/refresh` | `device:sync` or `device:manage`                     |
| Realtime refresh alias | `POST`   | `/api/v1/devices/:id/realtime/refresh` | `device:sync` or `device:manage`                     |
| Ping action            | `POST`   | `/api/v1/devices/:id/actions/ping`     | `device:test` or `device:connect` or `device:manage` |
| Backup action          | `POST`   | `/api/v1/devices/:id/actions/backup`   | `device:sync` or `device:manage`                     |
| Supout action          | `POST`   | `/api/v1/devices/:id/actions/supout`   | `device:sync` or `device:manage`                     |
| Reboot action          | `POST`   | `/api/v1/devices/:id/actions/reboot`   | `device:manage`                                      |

## Routes intentionally left readable

```txt
GET /api/v1/devices
GET /api/v1/devices/:id
GET /api/v1/realtime/devices
GET /api/v1/realtime/scheduler/status
GET /api/v1/realtime/devices/:id
GET /api/v1/realtime/devices/:id/stream
GET /api/v1/devices/:id/realtime
```

## Request examples

Create device:

```http
POST /api/v1/devices
Content-Type: application/json
x-rbac-permissions: device:manage

{
  "name": "Protected Device",
  "host": "192.0.2.10",
  "port": 8728,
  "username": "admin",
  "password": "",
  "useTls": false,
  "loginMode": "auto",
  "tags": ["protected"]
}
```

Connection test:

```http
POST /api/v1/devices/test
Content-Type: application/json
x-rbac-permissions: device:connect

{
  "host": "192.0.2.10",
  "port": 8728,
  "username": "admin",
  "password": "",
  "useTls": false,
  "loginMode": "auto",
  "timeoutMs": 1000
}
```

Scheduler start:

```http
POST /api/v1/realtime/scheduler/start
Content-Type: application/json
x-rbac-permissions: device:sync

{
  "intervalMs": 30000,
  "ttlMs": 60000
}
```

Ping action:

```http
POST /api/v1/devices/:id/actions/ping
Content-Type: application/json
x-rbac-permissions: device:test

{
  "address": "8.8.8.8",
  "count": 2
}
```

Backup action:

```http
POST /api/v1/devices/:id/actions/backup
Content-Type: application/json
x-rbac-permissions: device:sync

{
  "name": "protected-backup"
}
```

Reboot action:

```http
POST /api/v1/devices/:id/actions/reboot
Content-Type: application/json
x-rbac-permissions: device:manage

{
  "confirm": true
}
```

## Smoke test

Terminal 1:

```powershell
pnpm --filter @mme/server dev
```

Terminal 2:

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/device-guard-smoke.ps1
```
