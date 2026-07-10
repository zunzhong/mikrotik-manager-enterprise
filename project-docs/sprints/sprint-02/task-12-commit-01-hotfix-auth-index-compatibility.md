# Hotfix — Auth Index Compatibility

Fixes server typecheck errors after adding Auth Session Foundation.

## Error

```txt
Module "./modules/auth/index.js" has no exported member "authRoutes"
Module "../../auth/index.js" has no exported member "authGuardService"
```

## Cause

The new root auth barrel file replaced the previous exports from the existing auth module structure.

Existing project modules still expect:

```txt
application/auth-guard.service
application/auth.service
domain/auth-user
presentation/auth.routes
```

## File

```txt
apps/server/src/modules/auth/index.ts
```

## Fix

Restore original exports and keep the new Auth Session Foundation exports:

```txt
application/auth-guard.service
application/auth.service
auth.session
auth.types
domain/auth-user
presentation/auth.routes
```

## Check

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm build
```
