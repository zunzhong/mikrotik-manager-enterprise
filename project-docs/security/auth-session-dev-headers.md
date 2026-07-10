# Auth Session Development Headers

Development headers allow local testing before the full production auth/session pipeline is enforced.

## Purpose

Auth Session and RBAC Guard features need a request principal.

During development, the frontend can send test principal headers so the dashboard can show:

```txt
User ID
Email
Roles
Permissions
Super admin flag
RBAC principal preview
```

## Headers

| Header               | Example                    | Meaning                 |
| -------------------- | -------------------------- | ----------------------- |
| `x-user-id`          | `demo-user`                | Current user ID         |
| `x-user-email`       | `demo@example.local`       | Current user email      |
| `x-user-name`        | `Demo User`                | Display name            |
| `x-rbac-roles`       | `admin,auditor`            | Direct role IDs         |
| `x-rbac-permissions` | `audit:export,device:read` | Direct permissions      |
| `x-rbac-super-admin` | `false`                    | Super admin bypass flag |

## Browser localStorage enable snippet

Paste into browser DevTools Console:

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

## Browser localStorage disable snippet

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

## Vite environment variables

`.env.local` example:

```env
VITE_AUTH_DEV_HEADERS_ENABLED=true
VITE_AUTH_DEV_USER_ID=demo-user
VITE_AUTH_DEV_EMAIL=demo@example.local
VITE_AUTH_DEV_NAME=Demo User
VITE_AUTH_DEV_ROLES=admin,auditor
VITE_AUTH_DEV_PERMISSIONS=audit:export,device:read
VITE_AUTH_DEV_SUPER_ADMIN=false
```

## Verify in Chrome DevTools

1. Open DevTools.
2. Go to `Network`.
3. Select `Fetch/XHR`.
4. Filter by:

   ```txt
   auth/session
   ```

5. Reload the page.
6. Click:

   ```txt
   /api/v1/auth/session/current
   ```

7. Open `Headers`.
8. Check `Request Headers` contains:

   ```txt
   x-user-id
   x-rbac-roles
   x-rbac-permissions
   ```

## Safety note

Development headers are for local development and smoke testing only.

Production auth must not trust browser-provided role/permission headers.

The future production path should resolve principals from a trusted server-side session, token, or API key source.
