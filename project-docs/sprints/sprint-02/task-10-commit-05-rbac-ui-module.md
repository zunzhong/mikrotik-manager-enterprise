# Sprint 02 Task 10 Commit 05 — RBAC UI Module

Adds the frontend RBAC module.

## Files

```txt
apps/web/src/modules/rbac/rbac.types.ts
apps/web/src/modules/rbac/rbac.api.ts
apps/web/src/modules/rbac/RbacPanel.tsx
apps/web/src/modules/rbac/rbac.css
apps/web/src/modules/rbac/index.ts
```

## Features

```txt
List permission catalog
List default roles
Assign role to user
Remove role from user
Show effective permissions
Run permission check
Show allow/deny result
```

## Not integrated yet

This commit does not modify `DashboardPage.tsx`.

Next commit:

```txt
Commit 06 — RBAC Dashboard Integration
```

## Check

```powershell
pnpm --filter @mme/web typecheck
pnpm build
```
