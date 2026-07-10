# Notification Protected Routes Plan

This document describes how to apply RBAC Guard to Notification Engine routes.

## Guard pattern

Single permission:

```ts
preHandler: [attachAuthContextPreHandler, rbacGuard('notification:manage')];
```

Compatibility permission set:

```ts
preHandler: [
  attachAuthContextPreHandler,
  rbacAnyGuard(
    ['notification:retry', 'notification:manage'] as RbacPermission[],
    'Notification retry permission is required',
  ),
];
```

## Recommended commit sequence

```txt
Commit 01 — Notification Permission Matrix
Commit 02 — Protect Notification Channel Write APIs
Commit 03 — Protect Notification Rule Write APIs
Commit 04 — Protect Notification Retry APIs
Commit 05 — Notification Guard Smoke Tests
Commit 06 — Notification Guard UI Permission States
Commit 07 — Notification Guard Docs
```

## Manual test strategy

Denied request:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/notifications/channels" `
  -ContentType "application/json" `
  -Body '{ }'
```

Allowed request:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/notifications/channels" `
  -ContentType "application/json" `
  -Headers @{ "x-rbac-permissions" = "notification:manage" } `
  -Body '{ }'
```

## Browser development testing

For local dashboard testing, enable dev auth headers:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'notification:manage,notification:retry');
location.reload();
```

## Safety

Do not protect all Notification routes in one commit.

Protect one route group at a time and run:

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm build
```

Then run relevant smoke tests.
