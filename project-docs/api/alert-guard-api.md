# Alert Guard API

This document lists Alert Lifecycle APIs protected by Auth Context + RBAC Guard.

## Guard pattern

Single permission guard:

```ts
preHandler: [attachAuthContextPreHandler, rbacGuard('alert:update')];
```

Compatibility guard:

```ts
preHandler: [
  attachAuthContextPreHandler,
  rbacAnyGuard(
    ['alert:acknowledge', 'alert:update', 'alert:manage'] as RbacPermission[],
    'Alert acknowledge permission is required',
  ),
];
```

## Protected routes

| Area                  | Method | Route                                                     | Required permission                                                 |
| --------------------- | ------ | --------------------------------------------------------- | ------------------------------------------------------------------- |
| Acknowledge alert     | `POST` | `/api/v1/alert-lifecycle/:id/acknowledge`                 | `alert:acknowledge` or `alert:update` or `alert:manage`             |
| Resolve alert         | `POST` | `/api/v1/alert-lifecycle/:id/resolve`                     | `alert:resolve` or `alert:update` or `alert:manage`                 |
| Bulk acknowledge      | `POST` | `/api/v1/alert-lifecycle/bulk/acknowledge`                | `alert:bulk` or `alert:update` or `alert:manage`                    |
| Bulk resolve          | `POST` | `/api/v1/alert-lifecycle/bulk/resolve`                    | `alert:bulk` or `alert:update` or `alert:manage`                    |
| Device resolve active | `POST` | `/api/v1/alert-lifecycle/device/:deviceId/resolve-active` | `alert:bulk` or `alert:resolve` or `alert:update` or `alert:manage` |

## Routes intentionally left readable

```txt
GET /api/v1/alert-lifecycle/summary
GET /api/v1/alert-lifecycle
GET /api/v1/alert-lifecycle/active
GET /api/v1/alert-lifecycle/:id
```

These routes remain readable during the staged rollout to avoid breaking dashboard visibility.

## Acknowledge alert

Denied without permission:

```http
POST /api/v1/alert-lifecycle/demo-alert/acknowledge
Content-Type: application/json

{
  "reason": "Denied acknowledge"
}
```

Allowed with granular permission:

```http
POST /api/v1/alert-lifecycle/demo-alert/acknowledge
Content-Type: application/json
x-rbac-permissions: alert:acknowledge

{
  "reason": "Protected acknowledge"
}
```

Compatibility fallback:

```http
POST /api/v1/alert-lifecycle/demo-alert/acknowledge
Content-Type: application/json
x-rbac-permissions: alert:update

{
  "reason": "Protected acknowledge via update fallback"
}
```

## Resolve alert

```http
POST /api/v1/alert-lifecycle/demo-alert/resolve
Content-Type: application/json
x-rbac-permissions: alert:resolve

{
  "reason": "Protected resolve"
}
```

Compatibility fallback:

```http
POST /api/v1/alert-lifecycle/demo-alert/resolve
Content-Type: application/json
x-rbac-permissions: alert:manage

{
  "reason": "Protected resolve via manage fallback"
}
```

## Bulk acknowledge

```http
POST /api/v1/alert-lifecycle/bulk/acknowledge
Content-Type: application/json
x-rbac-permissions: alert:bulk

{
  "alertIds": ["demo-alert"],
  "reason": "Protected bulk acknowledge"
}
```

Compatibility fallback:

```http
POST /api/v1/alert-lifecycle/bulk/acknowledge
Content-Type: application/json
x-rbac-permissions: alert:update

{
  "alertIds": ["demo-alert"],
  "reason": "Protected bulk acknowledge via update fallback"
}
```

## Bulk resolve

```http
POST /api/v1/alert-lifecycle/bulk/resolve
Content-Type: application/json
x-rbac-permissions: alert:bulk

{
  "alertIds": ["demo-alert"],
  "reason": "Protected bulk resolve"
}
```

## Device resolve active

```http
POST /api/v1/alert-lifecycle/device/demo-device/resolve-active
Content-Type: application/json
x-rbac-permissions: alert:resolve

{
  "reason": "Protected device resolve active"
}
```

Compatibility fallback:

```http
POST /api/v1/alert-lifecycle/device/demo-device/resolve-active
Content-Type: application/json
x-rbac-permissions: alert:bulk

{
  "reason": "Protected device resolve active via bulk"
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
  -File tools/smoke-tests/alert-guard-smoke.ps1
```
