# Sprint 02 Task 14 Commit 07 — Notification Guard UI Permission States

Adds frontend helpers for displaying Notification permission states.

## Files

```txt
apps/web/src/modules/notification-guard/notification-permissions.ts
apps/web/src/modules/notification-guard/NotificationPermissionGate.tsx
apps/web/src/modules/notification-guard/NotificationPermissionNotice.tsx
apps/web/src/modules/notification-guard/notification-guard.css
apps/web/src/modules/notification-guard/index.ts
project-docs/snippets/notification-guard-ui-permission-states.snippet.tsx
```

## UI permission actions

```txt
read
manage
retry
test
send
```

## Permission mapping

```txt
read   -> notification:read or notification:manage or dashboard:read
manage -> notification:manage
retry  -> notification:retry or notification:manage
test   -> notification:test or notification:manage
send   -> notification:send or notification:manage
```

## Components

```txt
NotificationPermissionGate
NotificationPermissionNotice
```

## Example

```tsx
<NotificationPermissionGate principal={principal} action="manage" mode="disable">
  <button disabled={!notificationPermissions.canManage}>Create channel</button>
</NotificationPermissionGate>
```

## Dev auth test

Enable a limited user:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'notification:read');
location.reload();
```

Enable manage user:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'notification:manage');
location.reload();
```

Enable retry/test/send only:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem(
  'mme.devAuth.permissions',
  'notification:retry,notification:test,notification:send',
);
location.reload();
```

## Check

```powershell
pnpm format:check
pnpm --filter @mme/web typecheck
pnpm build
```

## UI runtime test

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
Commit 08 — Notification Guard Docs
```
