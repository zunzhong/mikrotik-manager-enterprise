# Sprint 02 Task 16 Commit 01 — Alert Permission Matrix

Starts Alert Guard Enforcement.

## Why this task now

Auth Context and RBAC Guard are already connected.

Audit, RBAC assignment, Notification, and Device routes have staged guard enforcement.

Alert Engine is the next high-value target because it can change incident state, suppress noise, bulk-update alerts, and affect operational visibility.

## Files

```txt
project-docs/security/alert-permission-matrix.md
project-docs/api/alert-protected-routes-plan.md
```

## Permission catalog

```txt
alert:read
alert:update
alert:acknowledge
alert:resolve
alert:silence
alert:bulk
alert:manage
```

## Compatibility strategy

Existing roles may already include:

```txt
alert:update
```

Therefore early route guards should allow `alert:update` as a fallback for new granular lifecycle permissions.

Example:

```ts
rbacAnyGuard(
  ['alert:resolve', 'alert:update', 'alert:manage'] as RbacPermission[],
  'Alert resolve permission is required',
);
```

## Enforcement stages

```txt
Stage 1 — Alert lifecycle write APIs
Stage 2 — Alert bulk APIs
Stage 3 — Alert management/test APIs
Stage 4 — Optional read APIs
```

## Current status

This commit is documentation/planning only.

It does not modify runtime behavior.

## Check

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm build
```

## Next commit

```txt
Commit 02 — Protect Alert Lifecycle Write APIs
```
