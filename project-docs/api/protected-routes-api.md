# Protected Routes API

This document lists APIs protected by Auth Context + RBAC Guard.

## Guard flow

Protected APIs use this pre-handler sequence:

```ts
preHandler: [attachAuthContextPreHandler, rbacGuard('permission:name')];
```

or:

```ts
preHandler: [
  attachAuthContextPreHandler,
  rbacAnyGuard(['permission:one', 'permission.two'] as RbacPermission[]),
];
```

## Protected routes

| API                   | Method   | Route                                      | Required permission           |
| --------------------- | -------- | ------------------------------------------ | ----------------------------- |
| Audit export          | `GET`    | `/api/v1/audit/export`                     | `audit:export`                |
| Audit retention prune | `POST`   | `/api/v1/audit/retention/prune`            | `audit:prune`                 |
| RBAC assign role      | `POST`   | `/api/v1/rbac/users/:userId/roles`         | `rbac:assign` or `role.write` |
| RBAC remove role      | `DELETE` | `/api/v1/rbac/users/:userId/roles/:roleId` | `rbac:assign` or `role.write` |

## Unprotected read routes

These remain readable during staged rollout:

```txt
GET /api/v1/audit
GET /api/v1/audit/page
GET /api/v1/audit/summary
GET /api/v1/audit/:id
GET /api/v1/rbac/permissions
GET /api/v1/rbac/roles
GET /api/v1/rbac/roles/:id
GET /api/v1/rbac/users/:userId/permissions
GET /api/v1/rbac/users/:userId/roles
POST /api/v1/rbac/check
```

## Audit export

```http
GET /api/v1/audit/export?format=json
x-rbac-permissions: audit:export
```

CSV:

```http
GET /api/v1/audit/export?format=csv
x-rbac-permissions: audit:export
```

Denied response without permission:

```json
{
  "success": false,
  "error": "Permission denied",
  "data": {
    "permission": "audit:export",
    "allowed": false,
    "roleIds": [],
    "generatedAt": "2026-07-10T00:00:00.000Z"
  }
}
```

## Audit retention prune

```http
POST /api/v1/audit/retention/prune
Content-Type: application/json
x-rbac-permissions: audit:prune

{
  "days": 30,
  "dryRun": true
}
```

Owner role can also allow this route if the persisted role includes `audit:prune`:

```http
POST /api/v1/audit/retention/prune
Content-Type: application/json
x-rbac-roles: owner

{
  "days": 30,
  "dryRun": true
}
```

## RBAC assign role

New permission:

```http
POST /api/v1/rbac/users/demo-user/roles
Content-Type: application/json
x-rbac-permissions: rbac:assign

{
  "roleId": "viewer",
  "assignedBy": "dashboard"
}
```

Legacy-compatible permission:

```http
POST /api/v1/rbac/users/demo-user/roles
Content-Type: application/json
x-rbac-permissions: role.write

{
  "roleId": "auditor",
  "assignedBy": "dashboard"
}
```

## RBAC remove role

```http
DELETE /api/v1/rbac/users/demo-user/roles/viewer
x-rbac-permissions: rbac:assign
```

or:

```http
DELETE /api/v1/rbac/users/demo-user/roles/auditor
x-rbac-permissions: role.write
```

## Smoke test

Terminal 1:

```powershell
pnpm --filter @mme/server dev
```

Terminal 2:

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/protected-routes-smoke.ps1
```
