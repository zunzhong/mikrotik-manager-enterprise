# Sprint 02 Task 15 Commit 05 — Protect Device Action APIs

Protects RouterOS device action routes with RBAC Guard.

## File

```txt
apps/server/src/modules/device/presentation/device.routes.ts
```

## Protected routes

```txt
POST /api/v1/devices/:id/actions/ping
POST /api/v1/devices/:id/actions/backup
POST /api/v1/devices/:id/actions/supout
POST /api/v1/devices/:id/actions/reboot
```

## Accepted permissions

Ping accepts:

```txt
device:test
device:connect
device:manage
```

Backup and supout accept:

```txt
device:sync
device:manage
```

Reboot accepts:

```txt
device:manage
```

## Why permissions differ by action

`ping` is a safe diagnostic action, so `device:test` and `device:connect` are enough.

`backup` and `supout` create device files and collect operational data, so they use `device:sync` or `device:manage`.

`reboot` is disruptive, so it requires `device:manage`.

## Manual tests

Terminal 1:

```powershell
pnpm --filter @mme/server dev
```

Ping allowed:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/devices/protected-device-demo/actions/ping" `
  -ContentType "application/json" `
  -Headers @{ "x-rbac-permissions" = "device:test" } `
  -Body '{ "address": "8.8.8.8", "count": 2 }'
```

Reboot allowed only with manage:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/devices/protected-device-demo/actions/reboot" `
  -ContentType "application/json" `
  -Headers @{ "x-rbac-permissions" = "device:manage" } `
  -Body '{ "confirm": true }'
```

## Check

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm build
```

## Next commit

```txt
Commit 06 — Device Guard Smoke Tests
```
