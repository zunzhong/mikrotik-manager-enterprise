# Sprint 02 Task 12 Commit 04 — Auth Session Web Client

Adds a typed web client module for Auth Session APIs.

## Files

```txt
apps/web/src/modules/auth-session/auth-session.types.ts
apps/web/src/modules/auth-session/auth-session.api.ts
apps/web/src/modules/auth-session/useAuthSession.ts
apps/web/src/modules/auth-session/AuthSessionStatusCard.tsx
apps/web/src/modules/auth-session/auth-session.css
apps/web/src/modules/auth-session/index.ts
```

## API client

```ts
authSessionApi.current();
authSessionApi.rbacPrincipal();
```

## Hook

```ts
const { current, rbacPrincipal, loading, error, refresh } = useAuthSession();
```

## UI component

```tsx
import { AuthSessionStatusCard } from '../modules/auth-session';

<AuthSessionStatusCard />;
```

## Not integrated yet

This commit does not edit `DashboardPage.tsx`.

The next commit can add a safe dashboard wrapper or integrate the card into an existing administration/security section.

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

Then open the web UI and mount `AuthSessionStatusCard` in a page/section.

## Next commit

```txt
Commit 05 — Auth Session Dashboard Integration
```
