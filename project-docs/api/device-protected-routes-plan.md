# Device Protected Routes Plan

This document describes how to apply RBAC Guard to Device Engine routes.

## Guard pattern

Single permission:

```ts
preHandler: [attachAuthContextPreHandler, rbacGuard('device:manage')];
```

Compatibility permission set:

```ts
preHandler: [
  attachAuthContextPreHandler,
  rbacAnyGuard(
    ['device:sync', 'device:manage'] as RbacPermission[],
    'Device sync permission is required',
  ),
];
```

## Recommended commit sequence

```txt
Commit 01 — Device Permission Matrix
Commit 02 — Protect Device Write APIs
Commit 03 — Protect Device Connection/Test APIs
Commit 04 — Protect Device Inventory Sync APIs
Commit 05 — Device Guard Smoke Tests
Commit 06 — Device Guard UI Permission States
Commit 07 — Device Guard Docs
```

## Manual test strategy

Denied request:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/devices" `
  -ContentType "application/json" `
  -Body '{ }'
```

Allowed request:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/devices" `
  -ContentType "application/json" `
  -Headers @{ "x-rbac-permissions" = "device:manage" } `
  -Body '{ }'
```

## Browser development testing

For local dashboard testing, enable dev auth headers:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'device:read,device:manage');
location.reload();
```

Sync-only test user:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'device:read,device:sync');
location.reload();
```

Connection-test user:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'device:read,device:connect');
location.reload();
```

## Safety

Do not protect all Device routes in one commit.

Protect one route group at a time and run:

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm build
```

Then run relevant smoke tests.
