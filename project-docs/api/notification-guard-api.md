# Notification Guard API

This document lists Notification Engine APIs protected by Auth Context + RBAC Guard.

## Guard pattern

Notification write routes use:

```ts
preHandler: [attachAuthContextPreHandler, rbacGuard('notification:manage')];
```

Retry/test/send routes use compatibility guards:

```ts
preHandler: [
  attachAuthContextPreHandler,
  rbacAnyGuard(
    ['notification:retry', 'notification:manage'] as RbacPermission[],
    'Notification retry permission is required',
  ),
];
```

## Protected routes

| Area                       | Method   | Route                                        | Required permission                           |
| -------------------------- | -------- | -------------------------------------------- | --------------------------------------------- |
| Channel create             | `POST`   | `/api/v1/notifications/channels`             | `notification:manage`                         |
| Channel update             | `PATCH`  | `/api/v1/notifications/channels/:id`         | `notification:manage`                         |
| Channel delete             | `DELETE` | `/api/v1/notifications/channels/:id`         | `notification:manage`                         |
| Rule create                | `POST`   | `/api/v1/notifications/rules`                | `notification:manage`                         |
| Rule update                | `PATCH`  | `/api/v1/notifications/rules/:id`            | `notification:manage`                         |
| Rule delete                | `DELETE` | `/api/v1/notifications/rules/:id`            | `notification:manage`                         |
| Retry one delivery         | `POST`   | `/api/v1/notifications/deliveries/:id/retry` | `notification:retry` or `notification:manage` |
| Retry failed deliveries    | `POST`   | `/api/v1/notifications/retry-failed`         | `notification:retry` or `notification:manage` |
| Process pending deliveries | `POST`   | `/api/v1/notifications/process-pending`      | `notification:send` or `notification:manage`  |
| Send test notification     | `POST`   | `/api/v1/notifications/test`                 | `notification:test` or `notification:manage`  |

## Routes intentionally left readable

```txt
GET  /api/v1/notifications/summary
GET  /api/v1/notifications/channels
GET  /api/v1/notifications/rules
GET  /api/v1/notifications/deliveries
POST /api/v1/notifications/seed-defaults
```

These routes are left open during the staged rollout to avoid breaking dashboard visibility.

## Channel create

Denied without permission:

```http
POST /api/v1/notifications/channels
Content-Type: application/json

{
  "name": "Denied Webhook",
  "type": "webhook",
  "enabled": true,
  "config": {
    "url": "https://example.local/denied"
  }
}
```

Allowed:

```http
POST /api/v1/notifications/channels
Content-Type: application/json
x-rbac-permissions: notification:manage

{
  "name": "Protected Webhook",
  "type": "webhook",
  "enabled": true,
  "config": {
    "url": "https://example.local/webhook"
  }
}
```

## Rule create

```http
POST /api/v1/notifications/rules
Content-Type: application/json
x-rbac-permissions: notification:manage

{
  "name": "Protected Rule",
  "enabled": true,
  "eventTypes": ["SYSTEM_EVENT"],
  "severities": ["info"],
  "channelIds": ["demo-channel"]
}
```

## Retry failed

New granular permission:

```http
POST /api/v1/notifications/retry-failed
Content-Type: application/json
x-rbac-permissions: notification:retry

{
  "limit": 10
}
```

Compatibility fallback:

```http
POST /api/v1/notifications/retry-failed
Content-Type: application/json
x-rbac-permissions: notification:manage

{
  "limit": 10
}
```

## Process pending

New granular permission:

```http
POST /api/v1/notifications/process-pending
Content-Type: application/json
x-rbac-permissions: notification:send

{
  "limit": 10
}
```

Compatibility fallback:

```http
POST /api/v1/notifications/process-pending
Content-Type: application/json
x-rbac-permissions: notification:manage

{
  "limit": 10
}
```

## Send test notification

New granular permission:

```http
POST /api/v1/notifications/test
Content-Type: application/json
x-rbac-permissions: notification:test

{
  "eventType": "SYSTEM_EVENT",
  "severity": "info",
  "title": "Protected Test",
  "message": "Protected notification test"
}
```

Compatibility fallback:

```http
POST /api/v1/notifications/test
Content-Type: application/json
x-rbac-permissions: notification:manage

{
  "eventType": "SYSTEM_EVENT",
  "severity": "info",
  "title": "Protected Test With Manage",
  "message": "Protected notification test using manage fallback"
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
  -File tools/smoke-tests/notification-guard-smoke.ps1
```
