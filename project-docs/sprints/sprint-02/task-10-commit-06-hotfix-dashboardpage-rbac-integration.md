# Hotfix — DashboardPage RBAC Integration

This patch integrates the RBAC dashboard wrapper into the current DashboardPage supplied by the user.

## Files

```txt
apps/web/src/pages/DashboardPage.tsx
apps/web/src/modules/rbac/RbacDashboardSection.tsx
apps/web/src/modules/rbac/index.ts
```

## Dashboard changes

```ts
import { RbacDashboardSection } from '../modules/rbac';
```

```tsx
<AuditLogPanel />

<RbacDashboardSection />
```

## Check

```powershell
pnpm --filter @mme/web typecheck
pnpm build
```
