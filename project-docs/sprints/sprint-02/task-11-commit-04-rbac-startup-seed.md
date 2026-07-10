# Sprint 02 Task 11 Commit 04 — RBAC Startup Seed

Adds startup/default seed support for persistent RBAC.

## Files

```txt
apps/server/src/modules/rbac/rbac.bootstrap.ts
apps/server/src/modules/rbac/rbac.routes.ts
apps/server/src/modules/rbac/index.ts
tools/http/rbac.http
```

## Startup behavior

When `rbacRoutes` is registered, RBAC defaults are seeded into the database:

```txt
owner
admin
operator
auditor
viewer
```

Default permissions are seeded through role permissions.

## Idempotency

The startup seed is idempotent in two layers:

```txt
In-process promise guard
Prisma upsert for roles/permissions/role permissions
```

This means repeated app startup or repeated route registration should not duplicate RBAC defaults.

## Manual seed endpoint

```http
POST /api/v1/rbac/seed-defaults
```

Response:

```json
{
  "success": true,
  "data": {
    "seeded": true,
    "generatedAt": "2026-07-09T00:00:00.000Z"
  }
}
```

Audit action:

```txt
rbac.defaults.seeded
```

## Check

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm build
```

## Next commit

```txt
Commit 05 — RBAC Persistence Smoke Update
```
