# Sprint 02 Task 15 Commit 01 — Device Permission Matrix

Starts Device Guard Enforcement.

## Why this task now

Auth Context and RBAC Guard are already connected.

Audit, RBAC assignment, and Notification write/retry/test/send routes are protected.

Device Engine is the next high-value target because it can store connection settings, connect to RouterOS devices, trigger inventory sync, and manage device records.

## Files

```txt
project-docs/security/device-permission-matrix.md
project-docs/api/device-protected-routes-plan.md
```

## Permission catalog

```txt
device:read
device:manage
device:connect
device:sync
device:test
```

## Compatibility strategy

Existing roles may already include:

```txt
device:read
device:manage
```

Therefore early route guards should allow `device:manage` as a fallback for new granular permissions.

Example:

```ts
rbacAnyGuard(
  ['device:sync', 'device:manage'] as RbacPermission[],
  'Device sync permission is required',
);
```

## Enforcement stages

```txt
Stage 1 — Device write APIs
Stage 2 — Device connection/test APIs
Stage 3 — Device inventory sync APIs
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
Commit 02 — Protect Device Write APIs
```
