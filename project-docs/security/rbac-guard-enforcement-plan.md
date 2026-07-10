# RBAC Guard Enforcement Plan

This document defines the staged rollout plan for enforcing RBAC permissions across APIs.

## Current status

RBAC persistence and guard foundation are available.

Current guard integration is limited to safe probe endpoints:

```txt
GET /api/v1/rbac/guard/probe/audit-export
GET /api/v1/rbac/guard/probe/rbac-manage
```

Existing dashboard APIs are not locked yet because the web app does not yet have a complete auth/session principal pipeline.

## Rollout principle

Guard integration should be staged.

Do not protect every API at once.

Recommended order:

```txt
1. Read-only sensitive endpoints
2. Export endpoints
3. Destructive/retention endpoints
4. Notification management
5. RBAC assignment/management
6. Device write operations
7. Dashboard-wide enforcement
```

## API enforcement matrix

| API area                | Example route                                     | Permission            |
| ----------------------- | ------------------------------------------------- | --------------------- |
| Dashboard summary       | `GET /api/v1/dashboard/summary`                   | `dashboard:read`      |
| Device read             | `GET /api/v1/devices`                             | `device:read`         |
| Device management       | `POST /api/v1/devices`                            | `device:manage`       |
| Alert lifecycle         | `POST /api/v1/alerts/:id/acknowledge`             | `alert:update`        |
| Notification read       | `GET /api/v1/notifications/channels`              | `notification:read`   |
| Notification management | `POST /api/v1/notifications/channels`             | `notification:manage` |
| Notification retry      | `POST /api/v1/notifications/retry-failed`         | `notification:manage` |
| Audit read              | `GET /api/v1/audit`                               | `audit:read`          |
| Audit export            | `GET /api/v1/audit/export`                        | `audit:export`        |
| Audit retention prune   | `POST /api/v1/audit/retention/prune`              | `audit:prune`         |
| RBAC read               | `GET /api/v1/rbac/roles`                          | `rbac:read`           |
| RBAC assign/remove      | `POST /api/v1/rbac/users/:userId/roles`           | `rbac:assign`         |
| RBAC assign/remove      | `DELETE /api/v1/rbac/users/:userId/roles/:roleId` | `rbac:assign`         |
| RBAC management         | Future role/permission write APIs                 | `rbac:manage`         |

## Guard examples

Audit export:

```ts
app.get(
  '/api/v1/audit/export',
  {
    preHandler: rbacGuard('audit:export'),
  },
  async (request, reply) => {
    // export audit logs
  },
);
```

Audit retention prune:

```ts
app.post(
  '/api/v1/audit/retention/prune',
  {
    preHandler: rbacGuard('audit:prune'),
  },
  async (request) => {
    // prune audit logs
  },
);
```

RBAC assignment:

```ts
app.post(
  '/api/v1/rbac/users/:userId/roles',
  {
    preHandler: rbacGuard('rbac:assign'),
  },
  async (request) => {
    // assign role
  },
);
```

## Auth/session dependency

Before enforcing guards on production routes, add a stable authenticated principal source.

Recommended request context:

```ts
request.user = {
  id: string;
  email: string;
  isSuperAdmin?: boolean;
};
```

Then update the guard to prefer:

```txt
request.user.id
request.user.isSuperAdmin
```

over test headers.

## Rollback plan

If a protected route breaks the dashboard, rollback by removing only the route-level `preHandler`.

Keep:

```txt
rbac.guard.ts
RBAC persistence
probe routes
smoke tests
```

because those are safe and independently useful.
