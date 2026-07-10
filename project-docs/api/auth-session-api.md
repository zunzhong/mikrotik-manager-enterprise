# Auth Session API

Auth Session APIs expose the current request principal and its RBAC-compatible principal shape.

Base path:

```txt
/api/v1/auth/session
```

## Current session

```http
GET /api/v1/auth/session/current
```

Anonymous response:

```json
{
  "success": true,
  "data": {
    "authenticated": false
  }
}
```

Authenticated development-header response:

```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "user": {
      "id": "demo-user",
      "email": "demo@example.local",
      "name": "Demo User",
      "roleIds": ["admin", "auditor"],
      "permissions": ["audit:export", "device:read"],
      "isSuperAdmin": false
    }
  }
}
```

## RBAC principal

```http
GET /api/v1/auth/session/rbac-principal
```

Anonymous response:

```json
{
  "success": true,
  "data": {
    "authenticated": false,
    "principal": null
  }
}
```

Authenticated response:

```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "principal": {
      "userId": "demo-user",
      "roleIds": ["admin"],
      "permissions": ["audit:export"],
      "isSuperAdmin": false
    }
  }
}
```

## Supported development headers

```txt
x-user-id
x-user-email
x-user-name
x-rbac-roles
x-rbac-permissions
x-rbac-super-admin
```

## PowerShell examples

Current user:

```powershell
Invoke-RestMethod `
  -Method GET `
  -Uri "http://localhost:3000/api/v1/auth/session/current" `
  -Headers @{
    "x-user-id" = "demo-user"
    "x-user-email" = "demo@example.local"
    "x-user-name" = "Demo User"
    "x-rbac-roles" = "admin,auditor"
    "x-rbac-permissions" = "audit:export,device:read"
    "x-rbac-super-admin" = "false"
  }
```

RBAC principal:

```powershell
Invoke-RestMethod `
  -Method GET `
  -Uri "http://localhost:3000/api/v1/auth/session/rbac-principal" `
  -Headers @{
    "x-user-id" = "demo-user"
    "x-rbac-roles" = "admin"
    "x-rbac-permissions" = "audit:export"
  }
```

## Web client

Web module:

```txt
apps/web/src/modules/auth-session
```

Main exports:

```ts
import {
  authSessionApi,
  useAuthSession,
  AuthSessionStatusCard,
  AuthSessionDashboardSection,
} from '../modules/auth-session';
```

## Dashboard integration

Import:

```ts
import { AuthSessionDashboardSection } from '../modules/auth-session';
```

Render:

```tsx
<AuthSessionDashboardSection />
```

## Smoke test

Terminal 1:

```powershell
pnpm --filter @mme/server dev
```

Terminal 2:

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/auth-session-smoke.ps1
```
