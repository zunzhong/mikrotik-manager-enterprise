# Sprint 02 Task 12 Commit 06 — Auth Dev Header Injection

Adds opt-in development auth/RBAC header injection to the web API client.

## Why

Auth Session Dashboard cards call backend APIs from the browser.

The backend can parse development auth headers, but the browser did not send them automatically.

This commit allows local development to opt into headers through `localStorage` or Vite environment variables.

## File

```txt
apps/web/src/lib/api.ts
```

## LocalStorage keys

```txt
mme.devAuth.enabled
mme.devAuth.userId
mme.devAuth.email
mme.devAuth.name
mme.devAuth.roles
mme.devAuth.permissions
mme.devAuth.superAdmin
```

## Vite env variables

```txt
VITE_AUTH_DEV_HEADERS_ENABLED
VITE_AUTH_DEV_USER_ID
VITE_AUTH_DEV_EMAIL
VITE_AUTH_DEV_NAME
VITE_AUTH_DEV_ROLES
VITE_AUTH_DEV_PERMISSIONS
VITE_AUTH_DEV_SUPER_ADMIN
```

## Browser enable snippet

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.userId', 'demo-user');
localStorage.setItem('mme.devAuth.email', 'demo@example.local');
localStorage.setItem('mme.devAuth.name', 'Demo User');
localStorage.setItem('mme.devAuth.roles', 'admin,auditor');
localStorage.setItem('mme.devAuth.permissions', 'audit:export,device:read');
localStorage.setItem('mme.devAuth.superAdmin', 'false');
location.reload();
```

## Browser disable snippet

```js
localStorage.removeItem('mme.devAuth.enabled');
localStorage.removeItem('mme.devAuth.userId');
localStorage.removeItem('mme.devAuth.email');
localStorage.removeItem('mme.devAuth.name');
localStorage.removeItem('mme.devAuth.roles');
localStorage.removeItem('mme.devAuth.permissions');
localStorage.removeItem('mme.devAuth.superAdmin');
location.reload();
```

## Safety

This is opt-in.

No dev auth header is sent unless:

```txt
mme.devAuth.enabled=true
```

or:

```txt
VITE_AUTH_DEV_HEADERS_ENABLED=true
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

Then open the browser console and paste the enable snippet.

## Next commit

```txt
Commit 07 — Auth Session Docs
```
