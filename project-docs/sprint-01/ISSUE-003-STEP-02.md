# ISSUE-003 / STEP-02 — Backend Logger & Error Foundation

## Goal

Improve backend foundation:

- Pretty logs in development using `pino-pretty`
- Centralized error handler
- Centralized not-found handler
- Clean server URL output
- Add `/api/v1` prefix preparation

---

## 1. Update `apps/server/package.json`

Replace file with:

```json
{
  "name": "@mme/server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@fastify/cors": "^10.0.2",
    "@fastify/helmet": "^12.0.1",
    "fastify": "^5.2.1",
    "pino": "^9.6.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/node": "^22.10.7",
    "pino-pretty": "^13.0.0",
    "tsx": "^4.19.2",
    "typescript": "^5.7.3"
  }
}
```

---

## 2. Create `apps/server/src/config/logger.ts`

```ts
import { env } from './env.js';

export function createLoggerConfig() {
  if (env.NODE_ENV === 'production') {
    return {
      level: process.env.LOG_LEVEL ?? 'info',
    };
  }

  return {
    level: process.env.LOG_LEVEL ?? 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  };
}
```

---

## 3. Create `apps/server/src/errors/http-error.ts`

```ts
export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
  }
}
```

---

## 4. Create `apps/server/src/plugins/error-handler.ts`

```ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { HttpError } from '../errors/http-error.js';

export async function registerErrorHandler(app: FastifyInstance): Promise<void> {
  app.setErrorHandler((error: Error, request: FastifyRequest, reply: FastifyReply) => {
    request.log.error(error);

    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      },
    });
  });

  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(404).send({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
      },
    });
  });
}
```

---

## 5. Update `apps/server/src/routes/health.ts`

Replace file with:

```ts
import type { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => {
    return {
      status: 'ok',
      name: env.APP_NAME,
      version: env.APP_VERSION,
      node: process.version,
      uptime: Number(process.uptime().toFixed(2)),
    };
  });

  app.get('/api/v1/health', async () => {
    return {
      success: true,
      data: {
        status: 'ok',
        name: env.APP_NAME,
        version: env.APP_VERSION,
        node: process.version,
        uptime: Number(process.uptime().toFixed(2)),
      },
    };
  });
}
```

---

## 6. Update `apps/server/src/app.ts`

Replace file with:

```ts
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import Fastify from 'fastify';
import { createLoggerConfig } from './config/logger.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { healthRoutes } from './routes/health.js';

export async function buildApp() {
  const app = Fastify({
    logger: createLoggerConfig(),
  });

  await registerErrorHandler(app);

  await app.register(cors, {
    origin: true,
  });

  await app.register(helmet);

  await app.register(healthRoutes);

  return app;
}
```

---

## 7. Update `apps/server/src/server.ts`

Replace file with:

```ts
import { buildApp } from './app.js';
import { env } from './config/env.js';

const app = await buildApp();

try {
  await app.listen({
    host: env.SERVER_HOST,
    port: env.SERVER_PORT,
  });

  const displayHost = env.SERVER_HOST === '0.0.0.0' ? 'localhost' : env.SERVER_HOST;
  app.log.info(`MME server running at http://${displayHost}:${env.SERVER_PORT}`);
} catch (error) {
  app.log.error(error, 'Failed to start server');
  process.exit(1);
}
```

---

## 8. Install

```powershell
pnpm install
```

---

## 9. Run

```powershell
pnpm dev
```

---

## 10. Test

Open:

```txt
http://localhost:3000/health
http://localhost:3000/api/v1/health
http://localhost:3000/not-found-test
```

Expected:

- `/health` returns old simple health JSON.
- `/api/v1/health` returns wrapped API response.
- `/not-found-test` returns clean 404 JSON.

---

## 11. Typecheck

```powershell
pnpm --filter @mme/server typecheck
```

---

## 12. Commit

```powershell
git add .
git commit -m "feat(server): add logger and error foundation"
git push
```

---

## Done Criteria

- Pretty logs appear in development.
- `/health` works.
- `/api/v1/health` works.
- 404 response is JSON.
- Typecheck passes.
