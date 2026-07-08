# Sprint 02 Task 09 Commit 01 — Audit Persistence Repository

Adds a Prisma repository for persistent audit storage using the existing `AuditLog` model.

## Files

```txt
apps/server/src/modules/audit/audit.repository.ts
apps/server/src/modules/audit/index.ts
```

## Current schema support

Existing Prisma model:

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  actorId   String?
  action    String
  entity    String
  entityId  String?
  metadata  Json?
  ipAddress String?
  createdAt DateTime @default(now())
}
```

The repository maps the richer Audit Log Engine model into this existing table:

```txt
AuditEvent.actor   -> metadata.actor
AuditEvent.entity  -> entity/entityId + metadata.entity
severity/status    -> metadata.severity/status
summary            -> metadata.summary
metadata           -> metadata.metadata
```

## Why not migrate yet?

This commit is low-risk: it introduces the persistent repository without changing runtime behavior yet.
The next commit will switch `audit.service.ts` and `audit.routes.ts` to async DB-backed operations.

## Check

```powershell
pnpm --filter @mme/server typecheck
pnpm build
```
