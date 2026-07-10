# Sprint 02 Task 12 Commit 03 — Auth Session Smoke Tests

Adds smoke tests for the Auth Session API.

## File

```txt
tools/smoke-tests/auth-session-smoke.ps1
```

## Covered endpoints

```txt
GET /api/v1/auth/session/current
GET /api/v1/auth/session/rbac-principal
```

## Assertions

```txt
Current session is anonymous without headers
Current session resolves user from development headers
RBAC principal is null without headers
RBAC principal resolves user ID, roles, and permissions from headers
Super admin header is parsed correctly
```

## Run

Terminal 1:

```powershell
pnpm --filter @mme/server dev
```

Terminal 2:

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/auth-session-smoke.ps1
```

## Run against custom base URL

```powershell
powershell -ExecutionPolicy Bypass `
  -File tools/smoke-tests/auth-session-smoke.ps1 `
  -BaseUrl "http://localhost:3000"
```

## Check

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm build
```

## Next commit

```txt
Commit 04 — Auth Session Web Client
```
