# Device Permission Matrix

This document defines the permission strategy for Device Guard Enforcement.

## Goal

Device APIs can create inventory records, store connection settings, test RouterOS access, sync inventory, and perform management actions.

These operations should be protected in stages to avoid breaking read-only dashboard views.

## Permission groups

| Permission       | Purpose                                                          |
| ---------------- | ---------------------------------------------------------------- |
| `device:read`    | Read devices, inventory, connection status, and summaries        |
| `device:manage`  | Create, update, delete, enable, disable, and edit device records |
| `device:connect` | Test RouterOS connection or run connection-sensitive checks      |
| `device:sync`    | Trigger inventory sync, discovery, or refresh jobs               |
| `device:test`    | Run safe test/probe actions without modifying persistent state   |

## Compatibility note

Existing tasks already used:

```txt
device:read
device:manage
```

If older code or seeded roles do not contain new granular permissions yet, route guards should initially accept:

```txt
device:manage
```

as the compatibility fallback for:

```txt
device:connect
device:sync
device:test
```

until the role seed catalog is normalized.

## Recommended route matrix

| Area                  | Route pattern                         | Method           | Permission                                           |
| --------------------- | ------------------------------------- | ---------------- | ---------------------------------------------------- |
| Device read           | `/api/v1/devices`                     | `GET`            | `device:read`                                        |
| Device detail         | `/api/v1/devices/:id`                 | `GET`            | `device:read`                                        |
| Device create         | `/api/v1/devices`                     | `POST`           | `device:manage`                                      |
| Device update         | `/api/v1/devices/:id`                 | `PATCH` / `PUT`  | `device:manage`                                      |
| Device delete         | `/api/v1/devices/:id`                 | `DELETE`         | `device:manage`                                      |
| Device enable/disable | `/api/v1/devices/:id/status`          | `PATCH` / `POST` | `device:manage`                                      |
| Connection test       | `/api/v1/devices/:id/test-connection` | `POST`           | `device:connect` or `device:manage`                  |
| Connection probe      | `/api/v1/devices/:id/probe`           | `POST`           | `device:test` or `device:connect` or `device:manage` |
| Inventory sync        | `/api/v1/devices/:id/sync`            | `POST`           | `device:sync` or `device:manage`                     |
| Bulk inventory sync   | `/api/v1/devices/sync`                | `POST`           | `device:sync` or `device:manage`                     |
| Discovery             | `/api/v1/devices/discovery`           | `POST`           | `device:sync` or `device:manage`                     |

## Staged enforcement plan

### Stage 1 — Guard device write APIs

Protect create/update/delete and enable/disable routes first.

Required permission:

```txt
device:manage
```

### Stage 2 — Guard connection/test APIs

Protect RouterOS connection tests and probes.

Accepted permissions:

```txt
device:connect
device:test
device:manage
```

### Stage 3 — Guard inventory sync APIs

Protect sync and discovery operations.

Accepted permissions:

```txt
device:sync
device:manage
```

### Stage 4 — Optional read guard

Read routes can remain open during local development.

If later enforcing read routes, use:

```txt
device:read
```

## Rollback rule

If a protected route breaks the dashboard, remove only the route-level `preHandler`.

Keep the permission matrix, guard helpers, docs, and smoke tests.
