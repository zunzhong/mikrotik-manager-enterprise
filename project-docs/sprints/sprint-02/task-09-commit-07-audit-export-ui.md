# Sprint 02 Task 09 Commit 07 — Audit Export UI

Adds JSON/CSV export controls to Audit Log Panel.

## Files

```txt
apps/web/src/modules/audit/audit.api.ts
apps/web/src/modules/audit/AuditLogPanel.tsx
apps/web/src/modules/audit/audit-log.css
```

## Behavior

```txt
Export JSON opens /api/v1/audit/export?format=json
Export CSV opens /api/v1/audit/export?format=csv
Current status/severity/entity filters are preserved
Default export limit is 1000 events
```

## Check

```powershell
pnpm --filter @mme/web typecheck
pnpm build
```
