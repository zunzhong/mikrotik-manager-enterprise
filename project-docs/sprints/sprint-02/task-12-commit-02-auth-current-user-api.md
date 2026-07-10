# Sprint 02 Task 12 Commit 02 — Auth Current User API

Adds current auth session APIs.

## Existing auth route registration

The application already imports and registers `authRoutes` from the auth module. Therefore this commit integrates `authSessionRoutes` inside the existing `authRoutes` function instead of editing `app.ts`.

## Files

```txt
apps/server/src/modules/auth/presentation/auth.session.routes.ts
apps/server/src/modules/auth/presentation/auth.routes.ts
apps/server/src/modules/auth/index.ts
tools/http/auth-session.http
```

## Endpoints

```txt
GET /api/v1/auth/session/current
GET /api/v1/auth/session/rbac-principal
```

## Current session response

Anonymous:

```json
{
  "success": true,
  "data": {
    "authenticated": false
  }
}
```

Authenticated by development headers:

```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "user": {
      "id": "demo-user",
      "email": "demo@example.local",
      "name": "Demo User",
      "roleIds": ["admin"],
      "permissions": ["audit:export"],
      "isSuperAdmin": false
    }
  }
}
```

## Supported headers

```txt
x-user-id
x-user-email
x-user-name
x-rbac-roles
x-rbac-permissions
x-rbac-super-admin
```

## Manual test

Terminal 1:

```powershell
pnpm --filter @mme/server dev
```

Terminal 2:

```powershell
Invoke-RestMethod `
  -Method GET `
  -Uri "http://localhost:3000/api/v1/auth/session/current" `
  -Headers @{
    "x-user-id" = "demo-user"
    "x-user-email" = "demo@example.local"
    "x-rbac-roles" = "admin"
  }
```

## Check

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm build
```

## Next commit

```txt
Commit 03 — Auth Session Smoke Tests
```
