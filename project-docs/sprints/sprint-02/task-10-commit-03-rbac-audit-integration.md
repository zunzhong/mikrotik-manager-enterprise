# Sprint 02 Task 10 Commit 03 — RBAC Audit Integration

Adds Audit Log events for RBAC API activity.

## File

```txt
apps/server/src/modules/rbac/rbac.routes.ts
```

## Audit actions

```txt
rbac.user_role.assigned
rbac.user_role.assign_failed
rbac.user_role.removed
rbac.user_role.remove_failed
rbac.permission.checked
```

## What gets audited

```txt
Assign user role success/failure
Remove user role success/failure
Permission check result
Principal metadata
Role assignment metadata
```

## Test with REST Client

```txt
tools/http/rbac.http
tools/http/audit-log.http
```

Recommended flow:

```txt
Assign admin role to demo-user
Check audit:export permission
Remove auditor role from demo-user
Open audit log list filtered by action=rbac.user_role.assigned
```

## Example audit query

```http
GET /api/v1/audit?action=rbac.user_role.assigned&limit=20
```

## Check

```powershell
pnpm --filter @mme/server typecheck
pnpm build
```
