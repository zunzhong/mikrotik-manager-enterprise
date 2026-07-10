# Hotfix — RBAC Seed Smoke Content-Type

Fixes the startup seed smoke test failing with:

```txt
Unsupported Media Type
FST_ERR_CTP_INVALID_MEDIA_TYPE
```

## Cause

PowerShell `Invoke-RestMethod` called:

```powershell
POST /api/v1/rbac/seed-defaults
```

without a JSON body/content-type. Fastify rejected the request before the route handler ran.

## Files

```txt
tools/smoke-tests/rbac-startup-seed-smoke.ps1
tools/http/rbac.http
```

## Fix

Send an empty JSON body for POST requests:

```json
{}
```

and set:

```txt
Content-Type: application/json
```

## Check

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm build

powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/rbac-startup-seed-smoke.ps1
```
