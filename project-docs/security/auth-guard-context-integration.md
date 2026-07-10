# Auth Guard Context Integration

Auth Guard Context Integration connects the Auth Session Foundation with RBAC route guards.

## Goal

Route guards should not parse raw request headers forever.

The desired flow is:

```txt
Request
  -> Auth Context Resolver
  -> request.authSession
  -> request.rbacPrincipal
  -> RBAC Guard
  -> Protected Route Handler
```

## Current implementation

Protected routes attach auth context before RBAC evaluation:

```ts
preHandler: [attachAuthContextPreHandler, rbacGuard('audit:export')];
```

This attaches:

```txt
request.authSession
request.rbacPrincipal
```

Then `rbacGuard()` reads:

```txt
1. request.rbacPrincipal
2. development headers fallback
```

## Main server files

```txt
apps/server/src/modules/auth/auth.context.ts
apps/server/src/modules/auth/auth.context.middleware.ts
apps/server/src/modules/auth/auth.session.ts
apps/server/src/modules/rbac/rbac.guard.ts
apps/server/src/modules/audit/audit.routes.ts
apps/server/src/modules/rbac/rbac.routes.ts
```

## Auth context helpers

```txt
resolveAuthRequestContext()
attachAuthRequestContext()
getAuthRequestContext()
getAuthRbacPrincipal()
attachAuthContextPreHandler()
authContextMiddleware()
```

## RBAC guard helpers

```txt
getRbacPrincipalFromRequestContext()
getRbacPrincipalFromHeaders()
getRbacPrincipalFromRequest()
requireRbacPermission()
requireAnyRbacPermission()
createRbacPreHandler()
createAnyRbacPreHandler()
rbacGuard()
rbacAnyGuard()
```

## Permission strategy

Use single-permission guard when route has one clear permission:

```ts
rbacGuard('audit:export');
```

Use any-permission guard during compatibility windows:

```ts
rbacAnyGuard(['rbac:assign', 'role.write'] as RbacPermission[]);
```

## Current protected permissions

```txt
audit:export
audit:prune
rbac:assign
role.write
```

## Development header fallback

Development headers still work for local tests:

```txt
x-user-id
x-rbac-roles
x-rbac-permissions
x-rbac-super-admin
```

This is useful for:

```txt
PowerShell smoke tests
REST Client files
Local browser dashboard testing
```

## Production hardening plan

Header fallback should be treated as development-only.

Production should use a trusted principal source:

```txt
Server-side session
Signed access token
API key mapped to a service account
Internal service principal
```

Then the guard should prefer only trusted server-side context.

## Recommended rollout order

Already protected:

```txt
1. Audit export
2. Audit retention prune
3. RBAC user role assignment
4. RBAC user role removal
```

Next candidates:

```txt
1. Notification management write APIs
2. Notification retry APIs
3. Device write/manage APIs
4. Alert lifecycle write APIs
```

## Rollback guide

If a protected route breaks a dashboard workflow, remove only the route `preHandler` entry.

Keep these foundations:

```txt
auth.context.ts
auth.context.middleware.ts
rbac.guard.ts
smoke tests
docs
```

## Smoke tests

Main protected route smoke test:

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/protected-routes-smoke.ps1
```

Existing supporting smoke tests:

```txt
tools/smoke-tests/rbac-guard-smoke.ps1
tools/smoke-tests/auth-session-smoke.ps1
tools/smoke-tests/rbac-persistence-smoke.ps1
```
