# Sprint 02 Task 15 Commit 07 — Device Guard UI Permission States

Adds frontend helpers for displaying Device permission states.

## Files

```txt
apps/web/src/modules/device-guard/device-permissions.ts
apps/web/src/modules/device-guard/DevicePermissionGate.tsx
apps/web/src/modules/device-guard/DevicePermissionNotice.tsx
apps/web/src/modules/device-guard/device-guard.css
apps/web/src/modules/device-guard/index.ts
project-docs/snippets/device-guard-ui-permission-states.snippet.tsx
```

## UI permission actions

```txt
read
manage
connect
sync
test
ping
backup
supout
reboot
```

## Permission mapping

```txt
read    -> device:read or device:manage or dashboard:read
manage  -> device:manage
connect -> device:connect or device:test or device:manage
sync    -> device:sync or device:manage
test    -> device:test or device:connect or device:manage
ping    -> device:test or device:connect or device:manage
backup  -> device:sync or device:manage
supout  -> device:sync or device:manage
reboot  -> device:manage
```

## Components

```txt
DevicePermissionGate
DevicePermissionNotice
```

## Example

```tsx
<DevicePermissionGate principal={principal} action="manage" mode="disable">
  <button disabled={!devicePermissions.canManage}>Create device</button>
</DevicePermissionGate>
```

## Dev auth test

Read-only device user:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'device:read');
location.reload();
```

Device manager:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'device:read,device:manage');
location.reload();
```

Device sync/test user:

```js
localStorage.setItem('mme.devAuth.enabled', 'true');
localStorage.setItem('mme.devAuth.permissions', 'device:read,device:sync,device:test');
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
Commit 08 — Device Guard Docs
```
