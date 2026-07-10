# Sprint 02 Task 12 Commit 05 — Auth Session Dashboard Integration

Adds a safe dashboard integration wrapper for the Auth Session UI module.

## Files

```txt
apps/web/src/modules/auth-session/AuthSessionDashboardSection.tsx
apps/web/src/modules/auth-session/index.ts
project-docs/snippets/auth-session-dashboard-integration.snippet.tsx
```

## Why this is safe

This commit does not overwrite:

```txt
apps/web/src/pages/DashboardPage.tsx
```

The Dashboard page has already been updated by multiple modules, so direct overwrite is risky.

## Manual Dashboard integration

Import:

```ts
import { AuthSessionDashboardSection } from '../modules/auth-session';
```

Render:

```tsx
<AuthSessionDashboardSection />
```

Recommended placement:

```txt
After <RbacDashboardSection />
Inside Administration / Security section
Near other auth/RBAC panels
```

## What the card shows

```txt
Authenticated / Anonymous state
User ID
Email
Roles
Permissions
Super admin flag
RBAC principal JSON preview
```

## Check

```powershell
pnpm format:check
pnpm --filter @mme/web typecheck
pnpm build
```

## Manual test

Terminal 1:

```powershell
pnpm --filter @mme/server dev
```

Terminal 2:

```powershell
pnpm --filter @mme/web dev
```

## Next commit

```txt
Commit 06 — Auth Session DashboardPage Hotfix
```

If direct Dashboard insertion is desired, use the current `DashboardPage.tsx` and patch it in a separate hotfix commit.
