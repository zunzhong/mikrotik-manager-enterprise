# Sprint 02 Task 12 Commit 01 — Auth Session Foundation

Starts the Auth Session Foundation task.

## Why this task now

RBAC persistence and permission guards are ready.

The next required layer is a stable auth/session principal so RBAC guards can read authenticated user context instead of trusting raw test headers.

## Files

```txt
apps/server/src/modules/auth/auth.types.ts
apps/server/src/modules/auth/auth.session.ts
apps/server/src/modules/auth/index.ts
```

## Main concepts

```txt
AuthSessionPrincipal
AuthSessionState
CreateAuthSessionPrincipalInput
AuthCurrentUserResponse
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

## Helper functions

```txt
createAuthSessionPrincipal()
createAnonymousAuthState()
createAuthenticatedAuthState()
authHeaderInputFromRequest()
authSessionPrincipalFromHeaders()
authSessionStateFromRequest()
rbacPrincipalFromAuthSession()
currentUserResponseFromAuthState()
```

## Example

```ts
import {
  authSessionStateFromRequest,
  currentUserResponseFromAuthState,
} from './modules/auth/index.js';

app.get('/api/v1/auth/me', async (request) => {
  const authState = authSessionStateFromRequest(request);

  return {
    success: true,
    data: currentUserResponseFromAuthState(authState),
  };
});
```

## Current status

This commit is foundation-only.

It does not register API routes yet.

It does not modify existing RBAC guard behavior yet.

## Check

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm build
```

## Next commit

```txt
Commit 02 — Auth Current User API
```
