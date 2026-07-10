# Hotfix — RBAC Seed Smoke Admin Permissions

Fixes the startup seed smoke test failing at:

```txt
Admin role is missing permission: rbac:assign
```

## Cause

The current project permission catalog uses the persisted RBAC permission set that includes:

```txt
rbac:read
role.write
```

The smoke test expected:

```txt
rbac:assign
```

That permission is not currently present in the seeded admin role returned by `/api/v1/rbac/roles/admin`.

## File

```txt
tools/smoke-tests/rbac-startup-seed-smoke.ps1
```

## Fix

The smoke test now validates stable admin permissions:

```txt
dashboard:read
audit:read
audit:export
rbac:read
```

And accepts either assignment-management permission:

```txt
role.write
rbac:assign
```

## Check

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm build

powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/rbac-startup-seed-smoke.ps1
```
