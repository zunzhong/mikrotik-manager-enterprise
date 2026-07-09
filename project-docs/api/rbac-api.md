# Enterprise RBAC API

Base path:

```txt
/api/v1/rbac
```

RBAC currently provides role catalog, permission catalog, user role assignment, effective permission resolution, and permission checking.

## Permission catalog

```http
GET /api/v1/rbac/permissions
```

Response:

```json
{
  "success": true,
  "data": [
    "*",
    "dashboard:read",
    "device:read",
    "device:manage",
    "alert:read",
    "alert:update",
    "notification:read",
    "notification:manage",
    "audit:read",
    "audit:export",
    "audit:prune",
    "rbac:read",
    "rbac:assign",
    "rbac:manage"
  ]
}
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

Example:

```http
GET /api/v1/rbac/users/demo-user/roles
```

## List effective user permissions

```http
GET /api/v1/rbac/users/:userId/permissions
```

Example:

```http
GET /api/v1/rbac/users/demo-user/permissions
```

Response:

```json
{
  "success": true,
  "data": {
    "userId": "demo-user",
    "roleIds": ["admin", "auditor"],
    "permissions": ["dashboard:read", "device:read", "audit:read", "audit:export"],
    "generatedAt": "2026-07-09T00:00:00.000Z"
  }
}
```

## Assign role to user

```http
POST /api/v1/rbac/users/:userId/roles
Content-Type: application/json
```

Body:

```json
{
  "roleId": "admin",
  "assignedBy": "dashboard"
}
```

Example:

```http
POST /api/v1/rbac/users/demo-user/roles
Content-Type: application/json

{
  "roleId": "admin",
  "assignedBy": "dashboard"
}
```

Audit action on success:

```txt
rbac.user_role.assigned
```

Audit action on missing role:

```txt
rbac.user_role.assign_failed
```

## Remove role from user

```http
DELETE /api/v1/rbac/users/:userId/roles/:roleId
```

Example:

```http
DELETE /api/v1/rbac/users/demo-user/roles/admin
```

Audit action on success:

```txt
rbac.user_role.removed
```

Audit action when assignment is missing:

```txt
rbac.user_role.remove_failed
```

## Check permission

```http
POST /api/v1/rbac/check
Content-Type: application/json
```

Body with `userId`:

```json
{
  "principal": {
    "userId": "demo-user"
  },
  "permission": "audit:export"
}
```

Body with explicit roles:

```json
{
  "principal": {
    "roleIds": ["viewer"]
  },
  "permission": "audit:export"
}
```

Body with explicit permissions:

```json
{
  "principal": {
    "permissions": ["device:read"]
  },
  "permission": "device:read"
}
```

Body with super admin bypass:

```json
{
  "principal": {
    "isSuperAdmin": true
  },
  "permission": "rbac:manage"
}
```

Audit action:

```txt
rbac.permission.checked
```

## Response format

Success:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "error": "RBAC role not found"
}
```

## Current persistence status

Current RBAC foundation uses in-memory assignment storage.

Production-ready persistence is planned in the next RBAC task:

```txt
Sprint 02 Task 11 — Persistent RBAC Storage
```

## Security notes

RBAC foundation currently provides permission resolution and check APIs.

Enforcement middleware/guards should be added later:

```txt
requirePermission('audit:export')
requirePermission('notification:manage')
requirePermission('rbac:manage')
```
