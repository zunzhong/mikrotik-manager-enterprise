# Alert Permission Matrix

This document defines the permission strategy for Alert Guard Enforcement.

## Goal

Alert APIs can acknowledge, resolve, silence, bulk-update, and manage lifecycle state.

These operations should be protected in stages to avoid breaking read-only dashboard views.

## Permission groups

| Permission          | Purpose                                                 |
| ------------------- | ------------------------------------------------------- |
| `alert:read`        | Read alert list, detail, summaries, and dashboard cards |
| `alert:update`      | Update alert lifecycle state                            |
| `alert:acknowledge` | Acknowledge active alerts                               |
| `alert:resolve`     | Resolve or close alerts                                 |
| `alert:silence`     | Silence, unsilence, or suppress alerts                  |
| `alert:bulk`        | Execute bulk alert lifecycle actions                    |
| `alert:manage`      | Administrative alert management fallback                |

## Compatibility note

Existing tasks already used:

```txt
alert:update
```

If older code or seeded roles do not contain new granular permissions yet, route guards should initially accept:

```txt
alert:update
alert:manage
```

as compatibility fallbacks for:

```txt
alert:acknowledge
alert:resolve
alert:silence
alert:bulk
```

until the role seed catalog is normalized.

## Recommended route matrix

| Area                 | Route pattern                    | Method  | Permission                                              |
| -------------------- | -------------------------------- | ------- | ------------------------------------------------------- |
| Alert read           | `/api/v1/alerts`                 | `GET`   | `alert:read`                                            |
| Alert detail         | `/api/v1/alerts/:id`             | `GET`   | `alert:read`                                            |
| Alert summary        | `/api/v1/alerts/summary`         | `GET`   | `alert:read`                                            |
| Alert acknowledge    | `/api/v1/alerts/:id/acknowledge` | `POST`  | `alert:acknowledge` or `alert:update` or `alert:manage` |
| Alert resolve        | `/api/v1/alerts/:id/resolve`     | `POST`  | `alert:resolve` or `alert:update` or `alert:manage`     |
| Alert silence        | `/api/v1/alerts/:id/silence`     | `POST`  | `alert:silence` or `alert:update` or `alert:manage`     |
| Alert unsilence      | `/api/v1/alerts/:id/unsilence`   | `POST`  | `alert:silence` or `alert:update` or `alert:manage`     |
| Alert generic update | `/api/v1/alerts/:id`             | `PATCH` | `alert:update` or `alert:manage`                        |
| Alert bulk actions   | `/api/v1/alerts/bulk`            | `POST`  | `alert:bulk` or `alert:update` or `alert:manage`        |
| Alert lifecycle bulk | `/api/v1/alerts/lifecycle/bulk`  | `POST`  | `alert:bulk` or `alert:update` or `alert:manage`        |

## Staged enforcement plan

### Stage 1 — Guard single alert lifecycle APIs

Protect acknowledge, resolve, silence, unsilence, and generic update routes first.

Accepted permissions:

```txt
alert:acknowledge
alert:resolve
alert:silence
alert:update
alert:manage
```

### Stage 2 — Guard bulk alert APIs

Protect bulk lifecycle operations.

Accepted permissions:

```txt
alert:bulk
alert:update
alert:manage
```

### Stage 3 — Guard management/test APIs

Protect administrative alert operations, seed/demo mutation, and maintenance actions.

Accepted permissions:

```txt
alert:manage
```

### Stage 4 — Optional read guard

Read routes can remain open during local development.

If later enforcing read routes, use:

```txt
alert:read
```

## Rollback rule

If a protected route breaks the dashboard, remove only the route-level `preHandler`.

Keep the permission matrix, guard helpers, docs, and smoke tests.
