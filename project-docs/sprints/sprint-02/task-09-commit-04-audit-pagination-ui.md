# Sprint 02 Task 09 Commit 04 — Audit Pagination UI

Updates Audit Log UI module to use the paginated Audit Log API.

## Files

```txt
apps/web/src/modules/audit/audit.types.ts
apps/web/src/modules/audit/audit.api.ts
apps/web/src/modules/audit/AuditLogPanel.tsx
apps/web/src/modules/audit/audit-log.css
```

## UI

```txt
Page size selector
Previous/Next buttons
Page indicator
Total count
Filter resets page to 1
```

## Check

```powershell
pnpm --filter @mme/web typecheck
pnpm build
```
