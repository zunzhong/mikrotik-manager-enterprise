# Audit Log API

Base URL:

```txt
http://localhost:3000/api/v1
```

## Purpose

The Audit Log Engine records system, API, user, scheduler, agent, notification, and retention activity.

It answers:

```txt
Who did what?
When did it happen?
Which entity was affected?
Did it succeed or fail?
What metadata was attached?
How can activity be filtered, exported, and retained?
```

---

# Storage

Audit logs are persisted with Prisma using the existing `AuditLog` model.

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

## Mapping

```txt
AuditEvent.id        -> AuditLog.id
AuditEvent.action    -> AuditLog.action
AuditEvent.entity    -> AuditLog.entity/entityId
AuditEvent.actor     -> AuditLog.metadata.actor
AuditEvent.severity  -> AuditLog.metadata.severity
AuditEvent.status    -> AuditLog.metadata.status
AuditEvent.summary   -> AuditLog.metadata.summary
AuditEvent.metadata  -> AuditLog.metadata.metadata
AuditEvent.createdAt -> AuditLog.createdAt
```

---

# Event Schema

```ts
interface AuditEvent {
  id: string;
  action: string;
  actor: AuditActor;
  entity?: AuditEntity;
  severity: 'info' | 'warning' | 'critical';
  status: 'success' | 'failure';
  summary: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
```

---

# Query Filters

Supported filters:

```txt
limit
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

---

# Endpoints

## Summary

```http
GET /audit/summary
```

Example:

```http
GET /audit/summary?status=failure&severity=warning
```

---

## List

```http
GET /audit?limit=20
```

Examples:

```http
GET /audit?status=failure&limit=20
GET /audit?severity=critical&limit=20
GET /audit?entityType=notification_channel&limit=20
GET /audit?action=notification.channel.created&limit=20
```

---

## Paginated List

```http
GET /audit/page?page=1&pageSize=25
```

Response:

```json
{
  "success": true,
  "data": {
    "items": [],
    "total": 0,
    "page": 1,
    "pageSize": 25,
    "totalPages": 0,
    "generatedAt": "2026-07-09T00:00:00.000Z"
  }
}
```

---

## Detail

```http
GET /audit/:id
```

---

## Create

```http
POST /audit
Content-Type: application/json

{
  "action": "manual.audit.test",
  "summary": "Manual audit event",
  "severity": "info",
  "status": "success",
  "actor": {
    "type": "api",
    "id": "rest-client",
    "name": "VS Code REST Client"
  },
  "entity": {
    "type": "system",
    "id": "audit",
    "name": "Audit Log Engine"
  },
  "metadata": {
    "manual": true
  }
}
```

---

## Seed Demo

```http
POST /audit/seed-demo
Content-Type: application/json

{}
```

---

# Export

## JSON

```http
GET /audit/export?format=json&limit=1000
```

## CSV

```http
GET /audit/export?format=csv&limit=1000
```

## Filtered CSV

```http
GET /audit/export?format=csv&status=failure&limit=500
```

Supported export filters:

```txt
action
actorType
actorId
entityType
entityId
severity
status
from
to
limit
```

PowerShell download:

```powershell
Invoke-WebRequest `
  -Uri "http://localhost:3000/api/v1/audit/export?format=csv&limit=1000" `
  -OutFile audit-log.csv
```

---

# Retention

## Dry-run

```http
POST /audit/retention/prune
Content-Type: application/json

{
  "days": 90,
  "dryRun": true
}
```

## Delete old logs

```http
POST /audit/retention/prune
Content-Type: application/json

{
  "days": 90,
  "dryRun": false
}
```

Safety:

```txt
dryRun defaults to true
days must be positive
days max is 3650
retention action records audit.retention.dry_run or audit.retention.pruned
```

---

# Notification Audit Actions

```txt
notification.channel.created
notification.channel.updated
notification.channel.deleted
notification.channel.update_failed
notification.channel.delete_failed
notification.rule.created
notification.rule.updated
notification.rule.deleted
notification.rule.update_failed
notification.rule.delete_failed
notification.delivery.queued
notification.delivery.process_pending
notification.delivery.retry_one
notification.delivery.retry_failed
notification.defaults.seeded
notification.defaults.seed_skipped
```

---

# Retention Audit Actions

```txt
audit.retention.dry_run
audit.retention.pruned
```

---

# Dashboard

Audit Log Panel supports:

```txt
Summary cards
Status filter
Severity filter
Entity filter
Pagination
Page size selector
Export JSON
Export CSV
Retention dry-run
Retention prune with confirmation
Recent audit event list
Metadata preview
Seed Demo
Refresh
```

---

# Smoke Tests

```powershell
powershell -ExecutionPolicy Bypass -File tools/smoke-tests/audit-log-smoke.ps1
powershell -ExecutionPolicy Bypass -File tools/smoke-tests/audit-retention-smoke.ps1
```

---

# VS Code REST Client

```txt
tools/http/audit-log.http
```
