# Sprint 02 Task 09 Commit 09 — Audit Retention API

Adds an Audit Log retention endpoint for pruning old audit records.

## Files

```txt
apps/server/src/modules/audit/audit.retention.ts
apps/server/src/modules/audit/audit.repository.ts
apps/server/src/modules/audit/audit.service.ts
apps/server/src/modules/audit/audit.routes.ts
apps/server/src/modules/audit/index.ts
tools/http/audit-log.http
```

## API

```txt
POST /api/v1/audit/retention/prune
```

## Dry-run

```json
{
  "days": 90,
  "dryRun": true
}
```

Response:

```json
{
  "dryRun": true,
  "days": 90,
  "cutoff": "2026-04-09T00:00:00.000Z",
  "matched": 25,
  "deleted": 0,
  "generatedAt": "2026-07-08T00:00:00.000Z"
}
```

## Delete old logs

```json
{
  "days": 90,
  "dryRun": false
}
```

## Safety

```txt
dryRun defaults to true
days must be positive
days max is 3650
retention action writes its own audit event
```

## Check

```powershell
pnpm --filter @mme/server typecheck
pnpm build
```
