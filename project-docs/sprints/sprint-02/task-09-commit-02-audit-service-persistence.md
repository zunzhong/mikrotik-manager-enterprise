# Sprint 02 Task 09 Commit 02 — Audit Service Persistence

Switches Audit Log Engine service and routes to Prisma-backed persistence.

## Files

```txt
apps/server/src/modules/audit/audit.service.ts
apps/server/src/modules/audit/audit.routes.ts
```

## Behavior

```txt
Audit events are stored in Prisma AuditLog table.
Audit API routes await persistent service operations.
Audit demo seeding writes to database.
Audit list/summary/detail read from database.
```

## Quick test

```powershell
Invoke-RestMethod -Method Post http://localhost:3000/api/v1/audit/seed-demo
Invoke-RestMethod http://localhost:3000/api/v1/audit/summary
Invoke-RestMethod http://localhost:3000/api/v1/audit?limit=20
```

Restart server, then run:

```powershell
Invoke-RestMethod http://localhost:3000/api/v1/audit?limit=20
```

Expected: previous audit events still exist.

## Check

```powershell
pnpm --filter @mme/server typecheck
pnpm build
```
