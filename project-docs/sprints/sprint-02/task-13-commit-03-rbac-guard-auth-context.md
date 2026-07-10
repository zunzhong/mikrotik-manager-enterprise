# Sprint 02 Task 13 Commit 03 — RBAC Guard Reads Auth Context

Updates RBAC guard to prefer the auth request context.

## Files

```txt
apps/server/src/modules/rbac/rbac.guard.ts
apps/server/src/modules/rbac/rbac.routes.ts
```

## Behavior

RBAC guard principal resolution now uses this order:

```txt
1. request.rbacPrincipal
2. x-user-id / x-rbac-roles / x-rbac-permissions development headers
```

## New helper

```ts
getRbacPrincipalFromRequestContext(request);
```

## Existing helper behavior changed

```ts
getRbacPrincipalFromRequest(request);
```

now prefers `request.rbacPrincipal` before falling back to headers.

## Probe route integration

RBAC guard probe routes now attach auth context before evaluating permissions:

```ts
preHandler: [attachAuthContextPreHandler, rbacGuard('audit:export')];
```

and:

```ts
preHandler: [attachAuthContextPreHandler, rbacGuard('rbac:manage')];
```

## Why fallback remains

Development headers remain supported so existing smoke tests and local dashboard testing continue to work.

A later production-hardening commit can disable direct header fallback for protected production routes.

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

## Check

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm build
```

## Next commit

```txt
Commit 04 — Protect Audit Export API
```
