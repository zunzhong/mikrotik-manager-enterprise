# Audit Log API

Base URL:

```txt
http://localhost:3000/api/v1
```

## Purpose

The Audit Log Engine records system, API, user, scheduler, and agent activity for traceability.

It is designed to answer:

```txt
Who did what?
When did it happen?
Which entity was affected?
Did it succeed or fail?
What metadata was attached?
```

---

# Audit Event Schema

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

## Actor

```ts
interface AuditActor {
  type: 'system' | 'user' | 'api' | 'agent' | 'scheduler';
  id?: string;
  name?: string;
  ip?: string;
  userAgent?: string;
}
```

## Entity

```ts
interface AuditEntity {
  type:
    | 'system'
    | 'device'
    | 'event'
    | 'alert'
    | 'notification_channel'
    | 'notification_rule'
    | 'notification_delivery'
    | 'auth'
    | 'config';
  id?: string;
  name?: string;
}
```

---

# Endpoints

## Summary

```http
GET /audit/summary
```

Optional filters:

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
```

Example:

```http
GET /audit/summary?status=failure&severity=warning
```

Response data:

```json
{
  "total": 4,
  "success": 0,
  "failure": 4,
  "info": 0,
  "warning": 4,
  "critical": 0,
  "generatedAt": "2026-07-08T00:00:00.000Z"
}
```

---

## List audit events

```http
GET /audit?limit=20
```

Common filters:

```http
GET /audit?status=failure&limit=20
GET /audit?severity=critical&limit=20
GET /audit?entityType=notification_channel&limit=20
GET /audit?action=notification.channel.created&limit=20
GET /audit?actorType=api&limit=20
```

---

## Get one audit event

```http
GET /audit/:id
```

Example:

```http
GET /audit/audit_123
```

---

## Create audit event

```http
POST /audit
Content-Type: application/json

{
  "action": "manual.audit.test",
  "summary": "Manual audit event from API docs",
  "severity": "info",
  "status": "success",
  "actor": {
    "type": "api",
    "id": "docs",
    "name": "API Docs"
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

## Seed demo audit events

```http
POST /audit/seed-demo
Content-Type: application/json

{}
```

This creates demo events for:

```txt
audit.seed_demo
notification.channel.created
notification.delivery.failed
```

---

# Notification Integration

The Notification Engine writes audit events for management and delivery operations.

## Channel actions

```txt
notification.channel.created
notification.channel.updated
notification.channel.deleted
notification.channel.update_failed
notification.channel.delete_failed
```

## Rule actions

```txt
notification.rule.created
notification.rule.updated
notification.rule.deleted
notification.rule.update_failed
notification.rule.delete_failed
```

## Delivery actions

```txt
notification.delivery.queued
notification.delivery.process_pending
notification.delivery.retry_one
notification.delivery.retry_failed
```

## Defaults

```txt
notification.defaults.seeded
notification.defaults.seed_skipped
```

---

# Dashboard

The Audit Log panel supports:

```txt
Summary cards
Status filter
Severity filter
Entity type filter
Recent audit event list
Metadata preview
Seed Demo
Refresh
```

---

# Smoke Test

Run the Audit Log smoke test:

```powershell
powershell -ExecutionPolicy Bypass -File tools/smoke-tests/audit-log-smoke.ps1
```

Skip notification integration part:

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/audit-log-smoke.ps1 `
  -SkipNotificationIntegration
```

---

# VS Code REST Client

Use:

```txt
tools/http/audit-log.http
```

Recommended flow:

```txt
Seed demo audit events
List audit events
Create manual audit event
Get audit event by ID
Filter by failure
Filter by entity type
```
