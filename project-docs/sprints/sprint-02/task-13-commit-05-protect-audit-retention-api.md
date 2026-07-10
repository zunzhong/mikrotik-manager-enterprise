# Sprint 02 Task 13 Commit 05 — Protect Audit Retention API

Protects the Audit Retention prune API with RBAC guard.

## File

```txt
apps/server/src/modules/audit/audit.routes.ts
```

## Protected route

```txt
POST /api/v1/audit/retention/prune
```

Required permission:

```txt
audit:prune
```

## Implementation

```ts
app.post(
  '/api/v1/audit/retention/prune',
  {
    preHandler: [attachAuthContextPreHandler, rbacGuard('audit:prune')],
  },
  async (request) => {
    // retention prune implementation
  },
);
```

## What remains protected from previous commit

```txt
GET /api/v1/audit/export
```

Required permission:

```txt
audit:export
```

## What remains unchanged

These routes are not protected in this commit:

```txt
GET /api/v1/audit
GET /api/v1/audit/page
GET /api/v1/audit/summary
GET /api/v1/audit/:id
POST /api/v1/audit
POST /api/v1/audit/seed-demo
```

This is intentional. Enforcement is staged to avoid breaking the dashboard.

## Manual tests

Terminal 1:

```powershell
pnpm --filter @mme/server dev
```

Denied without permission:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/audit/retention/prune" `
  -ContentType "application/json" `
  -Body '{ "days": 30, "dryRun": true }'
```

Allowed with direct permission:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/audit/retention/prune" `
  -ContentType "application/json" `
  -Headers @{ "x-rbac-permissions" = "audit:prune" } `
  -Body '{ "days": 30, "dryRun": true }'
```

Allowed with owner role:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/v1/audit/retention/prune" `
  -ContentType "application/json" `
  -Headers @{ "x-rbac-roles" = "owner" } `
  -Body '{ "days": 30, "dryRun": true }'
```

## Web UI note

If retention prune is triggered from the browser, the web app must send a principal with `audit:prune`.

In local development, enable dev auth headers with:

```txt
mme.devAuth.enabled=true
mme.devAuth.permissions=audit:prune
```

or use:

```txt
mme.devAuth.roles=owner
```

## Check

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm build
```

## Next commit

```txt
Commit 06 — Protect RBAC Assignment API
```
