# Sprint 02 Task 09 Commit 06 — Audit Export API

Adds JSON and CSV export for Audit Log Engine.

## Files

```txt
apps/server/src/modules/audit/audit.export.ts
apps/server/src/modules/audit/audit.routes.ts
apps/server/src/modules/audit/index.ts
tools/http/audit-log.http
```

## API

```txt
GET /api/v1/audit/export?format=json
GET /api/v1/audit/export?format=csv
```

## Supported filters

```txt
action
actorType
actorId
entityType
entityId
severity
status
from
to
limit
```

## Examples

```powershell
Invoke-WebRequest `
  -Uri "http://localhost:3000/api/v1/audit/export?format=csv&limit=1000" `
  -OutFile audit-log.csv
```

```powershell
Invoke-WebRequest `
  -Uri "http://localhost:3000/api/v1/audit/export?format=json&limit=1000" `
  -OutFile audit-log.json
```

## Check

```powershell
pnpm --filter @mme/server typecheck
pnpm build
```
