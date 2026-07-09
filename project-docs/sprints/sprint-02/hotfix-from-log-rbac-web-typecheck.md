# Hotfix From Log — RBAC Web Typecheck

The uploaded log shows 9 RBAC web type errors. This patch aligns the new RBAC UI/API module with the existing AdministrationPageView contract.

## Files

```txt
apps/web/src/modules/rbac/rbac.api.ts
apps/web/src/modules/rbac/RbacPanel.tsx
apps/web/src/modules/rbac/index.ts
```

## Check

```powershell
pnpm --filter @mme/web typecheck
pnpm build
```
