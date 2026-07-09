# Hotfix — CI #151 Format Check

GitHub Actions CI #151 failed during `pnpm format:check`.

This patch reformats the RBAC web files and Dashboard integration files touched by Commit 05/06.

## Files

```txt
apps/web/src/modules/rbac/rbac.api.ts
apps/web/src/modules/rbac/RbacPanel.tsx
apps/web/src/modules/rbac/RbacDashboardSection.tsx
apps/web/src/modules/rbac/index.ts
apps/web/src/pages/DashboardPage.tsx
project-docs/snippets/rbac-dashboard-integration.snippet.tsx
```

## Check

```powershell
pnpm format:check
pnpm --filter @mme/web typecheck
pnpm build
```
