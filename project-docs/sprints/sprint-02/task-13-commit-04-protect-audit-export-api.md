# Sprint 02 Task 13 Commit 04 — Protect Audit Export API

Protects the Audit Export API with RBAC guard.

## File

```txt
apps/server/src/modules/audit/audit.routes.ts
```

## Protected route

```txt
GET /api/v1/audit/export
```

Required permission:

```txt
audit:export
```

## Implementation

```ts
app.get(
  '/api/v1/audit/export',
  {
    preHandler: [attachAuthContextPreHandler, rbacGuard('audit:export')],
  },
  async (request, reply) => {
    // export implementation
  },
);
```

## What remains unchanged

These routes are not protected in this commit:

```txt
GET /api/v1/audit
GET /api/v1/audit/page
GET /api/v1/audit/summary
GET /api/v1/audit/:id
POST /api/v1/audit/retention/prune
```

This is intentional. Guard enforcement should be staged route by route.

## Manual tests

Terminal 1:

```powershell
pnpm --filter @mme/server dev
```

Denied without permission:

```powershell
Invoke-RestMethod `
  -Method GET `
  -Uri "http://localhost:3000/api/v1/audit/export?format=json"
```

Allowed with direct permission:

```powershell
Invoke-RestMethod `
  -Method GET `
  -Uri "http://localhost:3000/api/v1/audit/export?format=json" `
  -Headers @{ "x-rbac-permissions" = "audit:export" }
```

Allowed with admin role:

```powershell
Invoke-RestMethod `
  -Method GET `
  -Uri "http://localhost:3000/api/v1/audit/export?format=json" `
  -Headers @{ "x-rbac-roles" = "admin" }
```

## Web UI note

If audit export is triggered from the browser, enable dev auth headers in localStorage or use a real authenticated session.

## Check

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm build
```

## Next commit

```txt
Commit 05 — Protect Audit Retention API
```
