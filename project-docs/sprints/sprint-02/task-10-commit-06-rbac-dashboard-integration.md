# Sprint 02 Task 10 Commit 06 — RBAC Dashboard Integration

Adds a safe dashboard integration wrapper for the RBAC UI module.

## Files

```txt
apps/web/src/modules/rbac/RbacDashboardSection.tsx
apps/web/src/modules/rbac/index.ts
project-docs/snippets/rbac-dashboard-integration.snippet.tsx
```

## Manual DashboardPage integration

Import:

```ts
import { RbacDashboardSection } from '../modules/rbac';
```

Render:

```tsx
<RbacDashboardSection />
```

Recommended placement:

```txt
After AuditLogPanel
Inside Administration / Security tab
Inside dashboard security section
```

## Check

```powershell
pnpm --filter @mme/web typecheck
pnpm build
```

## Next commit

```txt
Commit 07 — RBAC API Docs
```
