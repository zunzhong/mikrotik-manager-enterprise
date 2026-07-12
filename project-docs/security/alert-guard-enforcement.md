# Alert Guard Enforcement

Alert Guard Enforcement protects alert lifecycle and bulk APIs.

## Goal

Alert Engine can change incident state, acknowledge alerts, resolve active conditions, and run bulk lifecycle operations.

Because of that, the following operations require explicit permissions:

```txt
Acknowledge alert
Resolve alert
Bulk acknowledge alerts
Bulk resolve alerts
Resolve all active alerts for a device
```

## Permission model

| Permission          | Meaning                                                  |
| ------------------- | -------------------------------------------------------- |
| `alert:read`        | Read alert list, details, summaries, and dashboard cards |
| `alert:update`      | Compatibility permission for alert lifecycle updates     |
| `alert:acknowledge` | Acknowledge alerts                                       |
| `alert:resolve`     | Resolve alerts                                           |
| `alert:silence`     | Silence or suppress alerts                               |
| `alert:bulk`        | Run bulk alert lifecycle actions                         |
| `alert:manage`      | Administrative fallback for Alert Engine                 |

## Compatibility policy

`alert:update` remains a fallback for lifecycle and bulk operations during the transition.

`alert:manage` remains an administrative fallback.

This keeps older seeded roles working while the permission catalog becomes more granular.

## Backend enforcement

Main backend file:

```txt
apps/server/src/modules/alert-lifecycle/alert-lifecycle.routes.ts
```

Foundation files:

```txt
apps/server/src/modules/auth/auth.context.ts
apps/server/src/modules/auth/auth.context.middleware.ts
apps/server/src/modules/rbac/rbac.guard.ts
```

## Protected lifecycle routes

```txt
POST /api/v1/alert-lifecycle/:id/acknowledge
POST /api/v1/alert-lifecycle/:id/resolve
```

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

## Protected bulk routes

```txt
POST /api/v1/alert-lifecycle/bulk/acknowledge
POST /api/v1/alert-lifecycle/bulk/resolve
POST /api/v1/alert-lifecycle/device/:deviceId/resolve-active
```

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

## Frontend permission state

Main frontend module:

```txt
apps/web/src/modules/alert-guard
```

Exports:

```txt
getAlertPermissionState()
AlertPermissionGate
AlertPermissionNotice
alertPermissionLabel()
```

UI action mapping:

```txt
read        -> alert:read or alert:update or alert:manage or dashboard:read
update      -> alert:update or alert:manage
acknowledge -> alert:acknowledge or alert:update or alert:manage
resolve     -> alert:resolve or alert:update or alert:manage
silence     -> alert:silence or alert:update or alert:manage
bulk        -> alert:bulk or alert:update or alert:manage
manage      -> alert:manage
```

## Browser development test

Read-only alert user:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'alert:read');
location.reload();
```

Alert update user:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'alert:read,alert:update');
location.reload();
```

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

## Smoke tests

```powershell
pnpm --filter @mme/server dev
```

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/alert-guard-smoke.ps1
```

## Missing alert IDs during tests

Allowed requests may return `404 ALERT_NOT_FOUND` when using a demo alert ID.

That is acceptable in guard smoke tests if the response is not `403`.

A non-403 response means RBAC allowed the request and the service later rejected missing data.

## Rollback guide

If a protected route breaks a dashboard flow, remove only the route-level `preHandler`.

Keep these files:

```txt
auth.context.ts
auth.context.middleware.ts
rbac.guard.ts
alert-guard UI module
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
