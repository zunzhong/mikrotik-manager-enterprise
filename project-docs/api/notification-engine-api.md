# Notification Engine API

Base URL:

```txt
http://localhost:3000/api/v1
```

## Flow

```txt
Event Bus
  ↓
Notification Event Bridge
  ↓
Notification Rules
  ↓
Notification Deliveries
  ↓
Delivery Worker
  ↓
in_app / webhook / skipped unsupported channels
```

## Channel types

```txt
in_app
webhook
email
slack
telegram
```

At this stage:

```txt
in_app  -> sent
webhook -> delivered through HTTP request
email/slack/telegram -> skipped until dedicated senders are implemented
```

---

# Summary

```http
GET /notifications/summary
```

Response data:

```json
{
  "channels": 2,
  "rules": 2,
  "deliveries": {
    "pending": 0,
    "sent": 10,
    "failed": 1,
    "skipped": 0
  },
  "generatedAt": "2026-07-08T00:00:00.000Z"
}
```

---

# Channels

## List channels

```http
GET /notifications/channels
```

## Create in-app channel

```http
POST /notifications/channels
Content-Type: application/json

{
  "name": "Default In-App Notifications",
  "type": "in_app",
  "enabled": true,
  "config": {}
}
```

## Create webhook channel

```http
POST /notifications/channels
Content-Type: application/json

{
  "name": "Enterprise Webhook",
  "type": "webhook",
  "enabled": true,
  "config": {
    "url": "http://localhost:5678/webhook/mme",
    "method": "POST",
    "timeoutMs": 10000,
    "headers": {
      "x-source": "mikrotik-manager-enterprise"
    }
  }
}
```

## Update channel

```http
PATCH /notifications/channels/:id
Content-Type: application/json

{
  "enabled": false
}
```

## Delete channel

```http
DELETE /notifications/channels/:id
```

When a channel is deleted, its ID is also removed from existing notification rules.

---

# Rules

## List rules

```http
GET /notifications/rules
```

## Create rule

```http
POST /notifications/rules
Content-Type: application/json

{
  "name": "Critical Alert Webhook",
  "enabled": true,
  "eventTypes": [
    "ALERT_OPENED",
    "DEVICE_OFFLINE",
    "DEVICE_CRITICAL"
  ],
  "severities": [
    "critical",
    "warning"
  ],
  "channelIds": [
    "channel_xxx"
  ]
}
```

## Update rule

```http
PATCH /notifications/rules/:id
Content-Type: application/json

{
  "enabled": false
}
```

## Delete rule

```http
DELETE /notifications/rules/:id
```

---

# Deliveries

## List recent deliveries

```http
GET /notifications/deliveries?limit=20
```

## Queue test payload

```http
POST /notifications/test
Content-Type: application/json

{
  "eventType": "ALERT_OPENED",
  "severity": "critical",
  "title": "Notification API test",
  "message": "This payload was queued from API docs.",
  "source": "docs"
}
```

## Process pending deliveries

```http
POST /notifications/process-pending
Content-Type: application/json

{
  "limit": 50
}
```

## Retry one delivery

```http
POST /notifications/deliveries/:id/retry
Content-Type: application/json

{}
```

## Retry failed/skipped deliveries

```http
POST /notifications/retry-failed
Content-Type: application/json

{
  "limit": 50
}
```

---

# Seed defaults

```http
POST /notifications/seed-defaults
Content-Type: application/json

{}
```

Default seed creates:

```txt
Default In-App Notifications channel
Critical Alert Lifecycle Events rule
```

---

# PowerShell quick test

```powershell
powershell -ExecutionPolicy Bypass -File tools/smoke-tests/notification-smoke.ps1
```

Force failed webhook delivery for retry testing:

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/notification-smoke.ps1 `
  -ForceFailedWebhook
```

Skip management API test:

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/notification-smoke.ps1 `
  -SkipManagementTest
```
