# Sprint 02 Task 09 Commit 05 — Audit Pagination Smoke Tests

Updates Audit Log smoke test to cover the paginated Audit Log API.

## Covered API

```txt
GET /api/v1/audit/page?page=1&pageSize=5
GET /api/v1/audit/page?page=2&pageSize=5
GET /api/v1/audit/page?page=1&pageSize=10&status=failure
GET /api/v1/audit/page?page=1&pageSize=10&entityType=notification_channel
```

## Page shape assertion

The smoke test checks response data includes:

```txt
items
total
page
pageSize
totalPages
generatedAt
```

## Run

```powershell
powershell -ExecutionPolicy Bypass -File tools/smoke-tests/audit-log-smoke.ps1
```

## Check

```powershell
pnpm --filter @mme/server typecheck
pnpm --filter @mme/web typecheck
pnpm build
```
