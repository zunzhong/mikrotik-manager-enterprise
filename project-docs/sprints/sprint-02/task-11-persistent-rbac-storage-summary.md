# Sprint 02 Task 11 — Persistent RBAC Storage Summary

## Status

```txt
In progress
```

## Completed commits

```txt
Commit 01 — RBAC Prisma Repository
Commit 02 — RBAC Service Persistence
Commit 03 — RBAC Persistence Smoke Tests
Commit 04 — RBAC Startup Seed
Commit 05 — RBAC Startup Seed Smoke Tests
Commit 06 — RBAC Permission Guard Foundation
Commit 07 — RBAC Guard Probe Integration
Commit 08 — RBAC Guard Smoke Tests
Commit 09 — RBAC Guard Docs
```

## Persistence implemented

RBAC now persists through existing Prisma models:

```txt
User
Role
Permission
UserRole
RolePermission
```

## Backend files

```txt
apps/server/src/modules/rbac/rbac.repository.ts
apps/server/src/modules/rbac/rbac.service.ts
apps/server/src/modules/rbac/rbac.bootstrap.ts
apps/server/src/modules/rbac/rbac.guard.ts
apps/server/src/modules/rbac/rbac.routes.ts
apps/server/src/modules/rbac/index.ts
```

## Persistent behavior

```txt
Default roles are seeded into DB
Default permissions are seeded into DB
RolePermission links are persisted
UserRole assignments are persisted
Effective permissions are resolved from DB
Permission checks support DB-backed users and explicit principals
```

## Startup seed

RBAC defaults seed when RBAC routes are registered.

Manual seed endpoint:

```txt
POST /api/v1/rbac/seed-defaults
```

Audit action:

```txt
rbac.defaults.seeded
```

## Guard foundation

RBAC guard supports:

```txt
getRbacPrincipalFromRequest()
requireRbacPermission()
createRbacPreHandler()
rbacGuard()
```

Probe endpoints:

```txt
GET /api/v1/rbac/guard/probe/audit-export
GET /api/v1/rbac/guard/probe/rbac-manage
```

## Smoke tests

```txt
tools/smoke-tests/rbac-persistence-smoke.ps1
tools/smoke-tests/rbac-startup-seed-smoke.ps1
tools/smoke-tests/rbac-guard-smoke.ps1
```

Smoke tests that need backend should be run with:

Terminal 1:

```powershell
pnpm --filter @mme/server dev
```

Terminal 2:

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/rbac-guard-smoke.ps1
```

## Current limitation

The guard currently reads principals from headers.

This is acceptable for development and smoke testing, but production enforcement should wait for the auth/session principal pipeline.

## Recommended next task

```txt
Sprint 02 Task 12 — Auth Session Foundation
```

Suggested commits:

```txt
Commit 01 — Auth Types and Session Principal
Commit 02 — Auth Middleware
Commit 03 — Login Session API
Commit 04 — Current User API
Commit 05 — Web Auth Client
Commit 06 — Attach RBAC Guard to Auth Context
Commit 07 — Auth Smoke Tests
Commit 08 — Auth Docs
```
