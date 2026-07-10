# Sprint 02 Task 11 Commit 06 — RBAC Permission Guard Foundation

Adds the reusable RBAC permission guard foundation.

## Files

```txt
apps/server/src/modules/rbac/rbac.guard.ts
apps/server/src/modules/rbac/index.ts
```

## Exports

```txt
getRbacPrincipalFromRequest()
requireRbacPermission()
createRbacPreHandler()
rbacGuard()
```

## Request headers

The guard currently builds the RBAC principal from headers.

| Header               | Meaning                                               |
| -------------------- | ----------------------------------------------------- |
| `x-user-id`          | Current user ID or email                              |
| `x-rbac-roles`       | Comma-separated role IDs                              |
| `x-rbac-permissions` | Comma-separated direct permissions                    |
| `x-rbac-super-admin` | `true`, `yes`, `y`, or `1` enables super admin bypass |

## Example usage

```ts
import { rbacGuard } from './modules/rbac/index.js';

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

## Custom usage

```ts
import { createRbacPreHandler } from './modules/rbac/index.js';

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

## Why this is not integrated into all APIs yet

This commit only adds the guard foundation.

The next commit should integrate guards into selected API groups gradually to reduce risk:

```txt
audit export
audit retention prune
notification management
RBAC assign/remove
```

## Check

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm build
```

## Next commit

```txt
Commit 07 — RBAC Guard Integration
```
