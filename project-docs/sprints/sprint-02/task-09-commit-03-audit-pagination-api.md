# Sprint 02 Task 09 Commit 03 — Audit Pagination API

Adds a paginated Audit Log API while keeping the existing list API compatible.

## New API

```txt
GET /api/v1/audit/page?page=1&pageSize=25
```

## Query filters

```txt
page
pageSize
action
actorType
actorId
entityType
entityId
severity
status
from
to
```

## Response

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 25,
  "totalPages": 0,
  "generatedAt": "2026-07-08T00:00:00.000Z"
}
```

## Quick test

```powershell
Invoke-RestMethod 'http://localhost:3000/api/v1/audit/page?page=1&pageSize=25'
```

## Check

```powershell
pnpm --filter @mme/server typecheck
pnpm build
```
