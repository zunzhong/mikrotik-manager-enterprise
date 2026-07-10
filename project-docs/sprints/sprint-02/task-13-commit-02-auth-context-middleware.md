# Sprint 02 Task 13 Commit 02 — Auth Context Middleware

Adds middleware helpers for attaching auth context to Fastify requests.

## Files

```txt
apps/server/src/modules/auth/auth.context.middleware.ts
apps/server/src/modules/auth/index.ts
```

## Exports

```txt
attachAuthContextPreHandler()
authContextMiddleware()
getRequiredAuthContext()
getRequiredRbacPrincipal()
AuthContextMiddlewareOptions
```

## What it does

`attachAuthContextPreHandler()` resolves the current request auth state and attaches:

```txt
request.authSession
request.rbacPrincipal
```

to the Fastify request.

## Route-level usage

```ts
import { attachAuthContextPreHandler } from './modules/auth/index.js';

app.get(
  '/api/v1/example/auth-context',
  {
    preHandler: attachAuthContextPreHandler,
  },
  async (request) => ({
    success: true,
    data: {
      authSession: request.authSession,
      rbacPrincipal: request.rbacPrincipal,
    },
  }),
);
```

## Plugin usage

```ts
import { authContextMiddleware } from './modules/auth/index.js';

await app.register(authContextMiddleware);
```

## Why not register globally yet

This commit only adds the middleware foundation.

Global registration should be done after RBAC guard can prefer `request.rbacPrincipal` and after protected-route smoke tests are ready.

This avoids changing runtime behavior for all routes too early.

## Check

```powershell
pnpm format:check
pnpm --filter @mme/server typecheck
pnpm build
```

## Next commit

```txt
Commit 03 — RBAC Guard Reads Auth Context
```
