# Alert Protected Routes Plan

This document describes how to apply RBAC Guard to Alert Engine routes.

## Guard pattern

Single permission:

```ts
preHandler: [attachAuthContextPreHandler, rbacGuard('alert:update')];
```

Compatibility permission set:

```ts
preHandler: [
  attachAuthContextPreHandler,
  rbacAnyGuard(
    ['alert:resolve', 'alert:update', 'alert:manage'] as RbacPermission[],
    'Alert resolve permission is required',
  ),
];
```

## Recommended commit sequence

```txt
Commit 01 — Alert Permission Matrix
Commit 02 — Protect Alert Lifecycle Write APIs
Commit 03 — Protect Alert Bulk APIs
Commit 04 — Alert Guard Smoke Tests
Commit 05 — Alert Guard UI Permission States
Commit 06 — Alert Guard Docs
```

## Manual test strategy

Denied request:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/alerts/alert-id/acknowledge" `
  -ContentType "application/json" `
  -Body '{ }'
```

Allowed request:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/alerts/alert-id/acknowledge" `
  -ContentType "application/json" `
  -Headers @{ "x-rbac-permissions" = "alert:acknowledge" } `
  -Body '{ "actor": "guard-smoke" }'
```

## Browser development testing

For local dashboard testing, enable dev auth headers:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'alert:read,alert:update');
location.reload();
```

Alert bulk user:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'alert:read,alert:bulk');
location.reload();
```

Alert manager:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'alert:read,alert:manage');
location.reload();
```

## Safety

Do not protect all Alert routes in one commit.

Protect one route group at a time and run:

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm build
```

Then run relevant smoke tests.
