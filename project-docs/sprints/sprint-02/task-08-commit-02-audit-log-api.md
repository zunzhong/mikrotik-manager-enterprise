# Sprint 02 Task 08 Commit 02 — Audit Log API

Adds API routes for Audit Log Engine.

## Files

```txt
apps/server/src/modules/audit/audit.routes.ts
apps/server/src/modules/audit/index.ts
```

## API

```txt
GET  /api/v1/audit/summary
GET  /api/v1/audit
GET  /api/v1/audit/:id
POST /api/v1/audit
POST /api/v1/audit/seed-demo
```

## app.ts registration

Add:

```ts
import { auditRoutes } from './modules/audit/index.js';
```

Then register:

```ts
await app.register(auditRoutes);
```

## Quick test

```powershell
Invoke-RestMethod -Method Post http://localhost:3000/api/v1/audit/seed-demo
Invoke-RestMethod http://localhost:3000/api/v1/audit/summary
Invoke-RestMethod http://localhost:3000/api/v1/audit?limit=20
```

## Check

```powershell
pnpm --filter @mme/server typecheck
pnpm build
```
