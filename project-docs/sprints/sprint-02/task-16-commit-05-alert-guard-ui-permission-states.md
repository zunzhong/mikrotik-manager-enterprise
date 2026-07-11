# Sprint 02 Task 16 Commit 05 — Alert Guard UI Permission States

Adds frontend helpers for displaying Alert permission states.

## Files

```txt
apps/web/src/modules/alert-guard/alert-permissions.ts
apps/web/src/modules/alert-guard/AlertPermissionGate.tsx
apps/web/src/modules/alert-guard/AlertPermissionNotice.tsx
apps/web/src/modules/alert-guard/alert-guard.css
apps/web/src/modules/alert-guard/index.ts
project-docs/snippets/alert-guard-ui-permission-states.snippet.tsx
```

## UI permission actions

```txt
read
update
acknowledge
resolve
silence
bulk
manage
```

## Permission mapping

```txt
read        -> alert:read or alert:update or alert:manage or dashboard:read
update      -> alert:update or alert:manage
acknowledge -> alert:acknowledge or alert:update or alert:manage
resolve     -> alert:resolve or alert:update or alert:manage
silence     -> alert:silence or alert:update or alert:manage
bulk        -> alert:bulk or alert:update or alert:manage
manage      -> alert:manage
```

## Components

```txt
AlertPermissionGate
AlertPermissionNotice
```

## Example

```tsx
<AlertPermissionGate principal={principal} action="acknowledge" mode="disable">
  <button disabled={!alertPermissions.canAcknowledge}>Acknowledge</button>
</AlertPermissionGate>
```

## Dev auth test

Read-only alert user:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'alert:read');
location.reload();
```

Alert update user:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'alert:read,alert:update');
location.reload();
```

Alert bulk user:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'alert:read,alert:bulk');
location.reload();
```

Alert manager:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'alert:read,alert:manage');
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
Commit 06 — Alert Guard Docs
```
