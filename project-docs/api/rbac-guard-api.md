# RBAC Permission Guard API

RBAC permission guards protect Fastify routes by resolving a request principal and checking the required permission.

## Guard exports

```ts
import {
  getRbacPrincipalFromRequest,
  requireRbacPermission,
  createRbacPreHandler,
  rbacGuard,
} from './modules/rbac/index.js';
```

## Principal headers

Until the full auth/session layer is complete, the guard can build a principal from request headers.

| Header               | Example               | Meaning                              |
| -------------------- | --------------------- | ------------------------------------ |
| `x-user-id`          | `admin@example.local` | Resolve persisted user roles from DB |
| `x-rbac-roles`       | `admin,auditor`       | Direct role IDs                      |
| `x-rbac-permissions` | `audit:export`        | Direct permissions                   |
| `x-rbac-super-admin` | `true`                | Super admin bypass                   |

## Simple guard

```ts
app.get(
  '/api/v1/example/audit-export',
  {
    preHandler: rbacGuard('audit:export'),
  },
  async () => ({
    success: true,
    data: {
      exported: true,
    },
  }),
);
```

## Custom guard

```ts
app.post(
  '/api/v1/example/rbac-admin',
  {
    preHandler: createRbacPreHandler({
      permission: 'rbac:manage',
      errorMessage: 'RBAC management permission is required',
    }),
  },
  async () => ({
    success: true,
  }),
);
```

## Manual permission check

```ts
const result = await requireRbacPermission(request, {
  permission: 'audit:export',
});

if (!result.allowed) {
  reply.code(403).send(result.response);
  return;
}
```

## Denied response

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

## Probe endpoints

Probe endpoints verify guard behavior without locking current production APIs.

```txt
GET /api/v1/rbac/guard/probe/audit-export
GET /api/v1/rbac/guard/probe/rbac-manage
```

`audit-export` requires:

```txt
audit:export
```

`rbac-manage` requires:

```txt
rbac:manage
```

## Probe examples

Denied:

```powershell
Invoke-RestMethod `
  -Method GET `
  -Uri "http://localhost:3000/api/v1/rbac/guard/probe/audit-export"
```

Allowed by role:

```powershell
Invoke-RestMethod `
  -Method GET `
  -Uri "http://localhost:3000/api/v1/rbac/guard/probe/audit-export" `
  -Headers @{ "x-rbac-roles" = "admin" }
```

Allowed by direct permission:

```powershell
Invoke-RestMethod `
  -Method GET `
  -Uri "http://localhost:3000/api/v1/rbac/guard/probe/audit-export" `
  -Headers @{ "x-rbac-permissions" = "audit:export" }
```

Allowed by super admin:

```powershell
Invoke-RestMethod `
  -Method GET `
  -Uri "http://localhost:3000/api/v1/rbac/guard/probe/rbac-manage" `
  -Headers @{ "x-rbac-super-admin" = "true" }
```

## Smoke test

Terminal 1:

```powershell
pnpm --filter @mme/server dev
```

Terminal 2:

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/rbac-guard-smoke.ps1
```

## Production note

Header-based principals are for development and integration testing.

When auth/session is implemented, the guard should read the principal from authenticated request context instead of trusting raw headers.
