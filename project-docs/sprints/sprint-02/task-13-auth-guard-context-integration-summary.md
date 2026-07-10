# Sprint 02 Task 13 — Auth Guard Context Integration Summary

## Status

```txt
Completed foundation and first protected route rollout
```

## Completed commits

```txt
Commit 01 — Auth Request Context Types
Commit 02 — Auth Context Middleware
Commit 03 — RBAC Guard Reads Auth Context
Commit 04 — Protect Audit Export API
Commit 05 — Protect Audit Retention API
Commit 06 — Protect RBAC Assignment API
Commit 07 — Protected Route Smoke Tests
Commit 08 — Auth Guard Context Docs
```

## Backend foundation

```txt
apps/server/src/modules/auth/auth.context.ts
apps/server/src/modules/auth/auth.context.middleware.ts
apps/server/src/modules/rbac/rbac.guard.ts
```

## Protected APIs

```txt
GET    /api/v1/audit/export
POST   /api/v1/audit/retention/prune
POST   /api/v1/rbac/users/:userId/roles
DELETE /api/v1/rbac/users/:userId/roles/:roleId
```

## Permissions

```txt
audit:export
audit:prune
rbac:assign
role.write
```

## Smoke test

```txt
tools/smoke-tests/protected-routes-smoke.ps1
```

Run:

```powershell
pnpm --filter @mme/server dev
```

Then:

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/protected-routes-smoke.ps1
```

## Current limitation

Dev header fallback remains enabled.

This is intentional for local development and smoke tests.

Production should later disable direct browser-controlled permission headers and resolve principals from trusted auth/session state.

## Recommended next task

```txt
Sprint 02 Task 14 — Notification Guard Enforcement
```

Suggested commits:

```txt
Commit 01 — Notification Permission Matrix
Commit 02 — Protect Notification Channel Write APIs
Commit 03 — Protect Notification Rule Write APIs
Commit 04 — Protect Notification Retry APIs
Commit 05 — Notification Guard Smoke Tests
Commit 06 — Notification Guard UI Permission States
Commit 07 — Notification Guard Docs
```

## Alternative next task

```txt
Sprint 02 Task 14 — Auth Login UI Foundation
```

Choose this if the next priority is moving from development headers to real user login/session.
