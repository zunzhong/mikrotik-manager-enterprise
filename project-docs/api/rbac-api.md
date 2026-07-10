# Enterprise RBAC API

Base path:

```txt
/api/v1/rbac
```

RBAC provides role catalog, permission catalog, persistent user role assignment, effective permission resolution, permission checking, startup seeding, and guard probe endpoints.

## Seed defaults

```http
POST /api/v1/rbac/seed-defaults
Content-Type: application/json

{}
```

Response:

```json
{
  "success": true,
  "data": {
    "seeded": true,
    "generatedAt": "2026-07-10T00:00:00.000Z"
  }
}
```

Audit action:

```txt
rbac.defaults.seeded
```

## Permission catalog

```http
GET /api/v1/rbac/permissions
```

## Role catalog

```http
GET /api/v1/rbac/roles
```

Default roles:

```txt
owner
admin
operator
auditor
viewer
```

## Get role detail

```http
GET /api/v1/rbac/roles/:id
```

Example:

```http
GET /api/v1/rbac/roles/admin
```

## List user roles

```http
GET /api/v1/rbac/users/:userId/roles
```

## List effective user permissions

```http
GET /api/v1/rbac/users/:userId/permissions
```

## Assign role to user

```http
POST /api/v1/rbac/users/:userId/roles
Content-Type: application/json

{
  "roleId": "admin",
  "assignedBy": "dashboard"
}
```

Audit actions:

```txt
rbac.user_role.assigned
rbac.user_role.assign_failed
```

## Remove role from user

```http
DELETE /api/v1/rbac/users/:userId/roles/:roleId
```

Audit actions:

```txt
rbac.user_role.removed
rbac.user_role.remove_failed
```

## Check permission

```http
POST /api/v1/rbac/check
Content-Type: application/json

{
  "principal": {
    "userId": "demo-user"
  },
  "permission": "audit:export"
}
```

Audit action:

```txt
rbac.permission.checked
```

## Guard probe endpoints

```http
GET /api/v1/rbac/guard/probe/audit-export
```

Required permission:

```txt
audit:export
```

```http
GET /api/v1/rbac/guard/probe/rbac-manage
```

Required permission:

```txt
rbac:manage
```

Supported test headers:

```txt
x-user-id
x-rbac-roles
x-rbac-permissions
x-rbac-super-admin
```

## Persistence status

RBAC now persists through Prisma:

```txt
User
Role
Permission
UserRole
RolePermission
```

## Production enforcement status

Guard foundation exists, but broad API enforcement should wait for the auth/session layer so the guard can resolve principals from authenticated request context instead of raw headers.
