# Sprint 02 Task 09 Commit 11 — Audit Retention Smoke Tests

Adds a dedicated smoke test for the Audit Retention API.

## Covered API

```txt
POST /api/v1/audit
POST /api/v1/audit/retention/prune
GET  /api/v1/audit/:id
GET  /api/v1/audit?action=audit.retention.pruned
GET  /api/v1/audit/summary
```

## Assertions

```txt
Old audit event can be created with createdAt
Recent audit event can be created
Dry-run matches old event but does not delete it
Real prune deletes old event
Recent event remains available
Retention prune writes an audit event
```

## Run

```powershell
powershell -ExecutionPolicy Bypass -File tools/smoke-tests/audit-retention-smoke.ps1
```

## Check

```powershell
pnpm --filter @mme/server typecheck
pnpm --filter @mme/web typecheck
pnpm build
```
