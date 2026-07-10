# Notification Permission Matrix

This document defines the permission strategy for Notification Guard Enforcement.

## Goal

Notification routes should be protected in stages.

The goal is to protect write, retry, test, and management operations without breaking read-only dashboard views.

## Permission groups

| Permission            | Purpose                                                               |
| --------------------- | --------------------------------------------------------------------- |
| `notification:read`   | Read notification channels, rules, deliveries, and summaries          |
| `notification:manage` | Create, update, enable, disable, and delete notification config       |
| `notification:retry`  | Retry failed notification deliveries                                  |
| `notification:test`   | Send test notification payloads                                       |
| `notification:send`   | Internal/system delivery permission for workers or service principals |

## Compatibility note

Existing tasks already used:

```txt
notification:manage
```

If older code or seeded roles do not contain new granular permissions yet, route guards should initially accept:

```txt
notification:manage
```

as the compatibility fallback for:

```txt
notification:retry
notification:test
notification:send
```

until the role seed catalog is normalized.

## Recommended route matrix

| Area               | Route pattern                                | Method                      | Permission                                    |
| ------------------ | -------------------------------------------- | --------------------------- | --------------------------------------------- |
| Channels read      | `/api/v1/notifications/channels`             | `GET`                       | `notification:read`                           |
| Channels create    | `/api/v1/notifications/channels`             | `POST`                      | `notification:manage`                         |
| Channels update    | `/api/v1/notifications/channels/:id`         | `PATCH` / `PUT`             | `notification:manage`                         |
| Channels delete    | `/api/v1/notifications/channels/:id`         | `DELETE`                    | `notification:manage`                         |
| Channels test      | `/api/v1/notifications/channels/:id/test`    | `POST`                      | `notification:test` or `notification:manage`  |
| Rules read         | `/api/v1/notifications/rules`                | `GET`                       | `notification:read`                           |
| Rules create       | `/api/v1/notifications/rules`                | `POST`                      | `notification:manage`                         |
| Rules update       | `/api/v1/notifications/rules/:id`            | `PATCH` / `PUT`             | `notification:manage`                         |
| Rules delete       | `/api/v1/notifications/rules/:id`            | `DELETE`                    | `notification:manage`                         |
| Deliveries read    | `/api/v1/notifications/deliveries`           | `GET`                       | `notification:read`                           |
| Retry failed       | `/api/v1/notifications/retry-failed`         | `POST`                      | `notification:retry` or `notification:manage` |
| Retry one          | `/api/v1/notifications/deliveries/:id/retry` | `POST`                      | `notification:retry` or `notification:manage` |
| Management summary | `/api/v1/notifications/management/summary`   | `GET`                       | `notification:read`                           |
| Management actions | `/api/v1/notifications/management/*`         | `POST` / `PATCH` / `DELETE` | `notification:manage`                         |

## Staged enforcement plan

### Stage 1 — Guard write APIs

Protect create/update/delete routes first.

Required permission:

```txt
notification:manage
```

### Stage 2 — Guard retry APIs

Protect retry operations.

Accepted permissions:

```txt
notification:retry
notification:manage
```

### Stage 3 — Guard test/send APIs

Protect test notification routes.

Accepted permissions:

```txt
notification:test
notification:manage
```

Internal delivery workers should use a trusted service principal when production auth is available.

### Stage 4 — Optional read guard

Read routes can remain open during local development.

If later enforcing read routes, use:

```txt
notification:read
```

## Rollback rule

If a protected route breaks the dashboard, remove only the route-level `preHandler`.

Keep the permission matrix, guard helpers, docs, and smoke tests.
