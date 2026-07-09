# Hotfix — RBAC API Compatibility

Fixes frontend typecheck errors caused by the existing `AdministrationPageView.tsx` expecting the older RBAC API contract.

## File

```txt
apps/web/src/modules/rbac/rbac.api.ts
```

## Added compatibility exports

```txt
AdminUser
Permission
Role
```

## Added compatibility methods

```txt
users()
assignRolePermission()
removeRolePermission()
```

## Check

```powershell
pnpm --filter @mme/web typecheck
pnpm build
```
