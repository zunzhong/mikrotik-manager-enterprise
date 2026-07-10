# Notification Guard Enforcement

Notification Guard Enforcement protects notification write, retry, test, and send operations.

## Goal

Notification Engine can send outbound messages and retry failed deliveries.

Because of that, the following operations should require explicit permissions:

```txt
Create/update/delete notification channels
Create/update/delete notification rules
Retry failed deliveries
Process pending deliveries
Send test notifications
```

## Permission model

| Permission            | Meaning                                |
| --------------------- | -------------------------------------- |
| `notification:read`   | Read notification state                |
| `notification:manage` | Manage notification channels and rules |
| `notification:retry`  | Retry failed deliveries                |
| `notification:test`   | Send test notifications                |
| `notification:send`   | Process/send pending deliveries        |

## Compatibility policy

`notification:manage` remains a fallback for retry, test, and send operations during the transition.

This keeps older seeded roles working while the permission catalog becomes more granular.

## Backend enforcement

Main backend file:

```txt
apps/server/src/modules/notifications/notification.routes.ts
```

Foundation files:

```txt
apps/server/src/modules/auth/auth.context.ts
apps/server/src/modules/auth/auth.context.middleware.ts
apps/server/src/modules/rbac/rbac.guard.ts
```

## Protected write routes

```txt
POST   /api/v1/notifications/channels
PATCH  /api/v1/notifications/channels/:id
DELETE /api/v1/notifications/channels/:id
POST   /api/v1/notifications/rules
PATCH  /api/v1/notifications/rules/:id
DELETE /api/v1/notifications/rules/:id
```

Required permission:

```txt
notification:manage
```

## Protected retry routes

```txt
POST /api/v1/notifications/deliveries/:id/retry
POST /api/v1/notifications/retry-failed
```

Accepted permissions:

```txt
notification:retry
notification:manage
```

## Protected send/test routes

```txt
POST /api/v1/notifications/process-pending
POST /api/v1/notifications/test
```

Accepted permissions:

```txt
process-pending: notification:send or notification:manage
test: notification:test or notification:manage
```

## Frontend permission state

Main frontend module:

```txt
apps/web/src/modules/notification-guard
```

Exports:

```txt
getNotificationPermissionState()
NotificationPermissionGate
NotificationPermissionNotice
notificationPermissionLabel()
```

UI action mapping:

```txt
read   -> notification:read or notification:manage or dashboard:read
manage -> notification:manage
retry  -> notification:retry or notification:manage
test   -> notification:test or notification:manage
send   -> notification:send or notification:manage
```

## Browser development test

Read-only notification user:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'notification:read');
location.reload();
```

Full notification management user:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'notification:manage');
location.reload();
```

Retry/test/send user without manage:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem(
  'mme.devAuth.permissions',
  'notification:retry,notification:test,notification:send',
);
location.reload();
```

## Smoke tests

Main test:

```txt
tools/smoke-tests/notification-guard-smoke.ps1
```

Run:

```powershell
pnpm --filter @mme/server dev
```

Then:

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/notification-guard-smoke.ps1
```

## Rollback guide

If a protected route breaks a dashboard flow, remove only the route-level `preHandler`.

Keep these files:

```txt
auth.context.ts
auth.context.middleware.ts
rbac.guard.ts
notification-guard UI module
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

The browser should not be trusted to directly decide its own permissions.
