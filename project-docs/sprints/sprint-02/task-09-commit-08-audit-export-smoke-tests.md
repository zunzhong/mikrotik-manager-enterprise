# Sprint 02 Task 09 Commit 08 — Audit Export Smoke Tests

Adds a dedicated smoke test for Audit Log JSON and CSV exports.

## File

```txt
tools/smoke-tests/audit-export-smoke.ps1
```

## Covered APIs

```txt
POST /api/v1/audit/seed-demo
GET  /api/v1/audit/export?format=json&limit=1000
GET  /api/v1/audit/export?format=csv&limit=1000
GET  /api/v1/audit/export?format=csv&status=failure&limit=500
```

## Assertions

```txt
JSON file exists
JSON file is not empty
JSON response success=true
JSON response has data.items
CSV file exists
CSV file is not empty
CSV header contains expected columns
Failed CSV export file exists
```

## Run

```powershell
powershell -ExecutionPolicy Bypass -File tools/smoke-tests/audit-export-smoke.ps1
```

## Run with custom export folder

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/audit-export-smoke.ps1 `
  -ExportDir ".\tmp\audit-export-test"
```

## Check

```powershell
pnpm --filter @mme/server typecheck
pnpm --filter @mme/web typecheck
pnpm build
```
