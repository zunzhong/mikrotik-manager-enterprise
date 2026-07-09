# Enterprise RBAC Permission Matrix

## Default roles

| Role     | Purpose                        | Typical user          |
| -------- | ------------------------------ | --------------------- |
| owner    | Full platform owner            | Business/system owner |
| admin    | Platform administration        | Senior administrator  |
| operator | Daily operation                | NOC/operator          |
| auditor  | Read audit and export evidence | Compliance/security   |
| viewer   | Read-only dashboard access     | Viewer/support        |

## Permission catalog

| Permission            | Meaning                                       |
| --------------------- | --------------------------------------------- |
| `*`                   | Wildcard full access                          |
| `dashboard:read`      | Read dashboard summary                        |
| `device:read`         | Read device inventory/status                  |
| `device:manage`       | Manage devices                                |
| `alert:read`          | Read alerts                                   |
| `alert:update`        | Update alert lifecycle                        |
| `notification:read`   | Read notification channels/rules/deliveries   |
| `notification:manage` | Manage notification configuration and retries |
| `audit:read`          | Read audit logs                               |
| `audit:export`        | Export audit logs                             |
| `audit:prune`         | Prune audit logs by retention policy          |
| `rbac:read`           | Read RBAC catalog and assignments             |
| `rbac:assign`         | Assign/remove user roles                      |
| `rbac:manage`         | Manage RBAC configuration                     |

## Default role matrix

| Permission            | owner | admin | operator | auditor | viewer |
| --------------------- | ----- | ----- | -------- | ------- | ------ |
| `*`                   | yes   | no    | no       | no      | no     |
| `dashboard:read`      | yes   | yes   | yes      | yes     | yes    |
| `device:read`         | yes   | yes   | yes      | yes     | yes    |
| `device:manage`       | yes   | yes   | yes      | no      | no     |
| `alert:read`          | yes   | yes   | yes      | yes     | yes    |
| `alert:update`        | yes   | yes   | yes      | no      | no     |
| `notification:read`   | yes   | yes   | yes      | yes     | no     |
| `notification:manage` | yes   | yes   | no       | no      | no     |
| `audit:read`          | yes   | yes   | no       | yes     | no     |
| `audit:export`        | yes   | yes   | no       | yes     | no     |
| `audit:prune`         | yes   | yes   | no       | no      | no     |
| `rbac:read`           | yes   | yes   | no       | yes     | no     |
| `rbac:assign`         | yes   | yes   | no       | no      | no     |
| `rbac:manage`         | yes   | no    | no       | no      | no     |

## Enforcement plan

Later API routes should be protected with permission guards.

Suggested examples:

| API group                    | Required permission   |
| ---------------------------- | --------------------- |
| Dashboard summary            | `dashboard:read`      |
| Device read APIs             | `device:read`         |
| Device write/manage APIs     | `device:manage`       |
| Alert lifecycle update APIs  | `alert:update`        |
| Notification management APIs | `notification:manage` |
| Audit list/detail APIs       | `audit:read`          |
| Audit export API             | `audit:export`        |
| Audit retention prune API    | `audit:prune`         |
| RBAC assign/remove APIs      | `rbac:assign`         |
| RBAC role/permission APIs    | `rbac:manage`         |
