# Sprint 02 Task 10 Commit 02 — RBAC API

Adds REST API routes for Enterprise RBAC.

## Files

```txt
apps/server/src/modules/rbac/rbac.routes.ts
apps/server/src/modules/rbac/index.ts
tools/http/rbac.http
```

## Route registration

Add this to `apps/server/src/app.ts`:

```ts
import { rbacRoutes } from './modules/rbac/index.js';

await app.register(rbacRoutes);
```

## API

```txt
GET    /api/v1/rbac/permissions
GET    /api/v1/rbac/roles
GET    /api/v1/rbac/roles/:id
GET    /api/v1/rbac/users/:userId/permissions
GET    /api/v1/rbac/users/:userId/roles
POST   /api/v1/rbac/users/:userId/roles
DELETE /api/v1/rbac/users/:userId/roles/:roleId
POST   /api/v1/rbac/check
```

## Example assign role

```http
POST /api/v1/rbac/users/demo-user/roles
Content-Type: application/json

{
  "roleId": "admin",
  "assignedBy": "rest-client"
}
```

## Example permission check

```http
POST /api/v1/rbac/check
Content-Type: application/json

{
  "principal": {
    "userId": "demo-user"
  },
  "permission": "audit:export"
}
```

## Check

```powershell
pnpm --filter @mme/server typecheck
pnpm build
```
