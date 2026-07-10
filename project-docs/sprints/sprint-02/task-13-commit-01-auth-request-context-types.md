# Sprint 02 Task 13 Commit 01 — Auth Request Context Types

Starts the Auth Guard Context Integration task.

## Why this task now

Auth Session Foundation can resolve a request principal from development headers.

RBAC guards can currently read headers directly.

The next step is to introduce a shared request context so future RBAC guards can read a trusted server-side auth principal instead of parsing headers themselves.

## Files

```txt
apps/server/src/modules/auth/auth.context.ts
apps/server/src/modules/auth/index.ts
```

## Fastify request context

This commit augments `FastifyRequest` with:

```ts
authSession?: AuthSessionState;
rbacPrincipal?: RbacPrincipal | null;
```

## Main type

```ts
export interface AuthRequestContext {
  authenticated: boolean;
  authState: AuthSessionState;
  rbacPrincipal: RbacPrincipal | null;
  principal?: AuthSessionPrincipal;
}
```

## Helpers

```txt
resolveAuthRequestContext()
attachAuthRequestContext()
getAuthRequestContext()
getAuthRbacPrincipal()
```

## Example

```ts
import { getAuthRequestContext } from './modules/auth/index.js';

app.get('/api/v1/example/context', async (request) => {
  const context = getAuthRequestContext(request);

  return {
    success: true,
    data: {
      authenticated: context.authenticated,
      principal: context.rbacPrincipal,
    },
  };
});
```

## Current status

This commit is foundation-only.

It does not register middleware yet.

It does not change RBAC guard behavior yet.

## Check

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm build
```

## Next commit

```txt
Commit 02 — Auth Context Middleware
```
