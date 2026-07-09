# Sprint 02 Task 09 Commit 10 — Audit Retention UI

Adds retention controls to Audit Log Panel.

## Files

```txt
apps/web/src/modules/audit/audit.types.ts
apps/web/src/modules/audit/audit.api.ts
apps/web/src/modules/audit/AuditLogPanel.tsx
apps/web/src/modules/audit/audit-log.css
```

## UI

```txt
Retention Days input
Dry Run
Prune Old Logs
Confirmation before real prune
Retention result preview
```

## Safety

```txt
Dry-run does not delete data
Prune requires browser confirmation
Days input is bounded from 1 to 3650
UI refreshes after real prune
```

## Check

```powershell
pnpm --filter @mme/web typecheck
pnpm build
```
