# Sprint 02 Task 14 Commit 01 — Notification Permission Matrix

Starts Notification Guard Enforcement.

## Why this task now

Auth Context and RBAC Guard are already connected.

Audit export, audit retention, and RBAC assignment routes are protected.

Notification Engine is the next high-value target because it can send outbound messages, retry deliveries, and manage webhook channels.

## Files

```txt
project-docs/security/notification-permission-matrix.md
project-docs/api/notification-protected-routes-plan.md
```

## Permission catalog

```txt
notification:read
notification:manage
notification:retry
notification:test
notification:send
```

## Compatibility strategy

Existing roles may only include:

```txt
notification:manage
```

Therefore early route guards should allow `notification:manage` as a fallback for new granular permissions.

Example:

```ts
rbacAnyGuard(
  ['notification:retry', 'notification:manage'] as RbacPermission[],
  'Notification retry permission is required',
);
```

## Enforcement stages

```txt
Stage 1 — Channel write APIs
Stage 2 — Rule write APIs
Stage 3 — Retry APIs
Stage 4 — Test/send APIs
Stage 5 — Optional read APIs
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
Commit 02 — Protect Notification Channel Write APIs
```
