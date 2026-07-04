# ISSUE-004 / STEP-01 — Backend Configuration Module

## Goal

Upgrade backend configuration from a simple `env.ts` file to a production-ready config module.

This step adds:

- Centralized `ConfigService`
- Typed app/server/database/redis config
- Safer environment parsing
- `.env.example`
- Better preparation for PostgreSQL, Redis, Prisma, and RouterOS modules

---

## 1. Create `.env.example`

### FILE: `.env.example`

```env
NODE_ENV=development

APP_NAME=mikrotik-manager-enterprise
APP_VERSION=0.1.0

SERVER_HOST=0.0.0.0
SERVER_PORT=3000

DATABASE_URL=postgresql://mme:mme_password@localhost:5432/mme?schema=public

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

LOG_LEVEL=info
```

---

## 2. Update `apps/server/src/config/env.ts`

Replace file with:

```ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  APP_NAME: z.string().min(1).default('mikrotik-manager-enterprise'),
  APP_VERSION: z.string().min(1).default('0.1.0'),

  SERVER_HOST: z.string().min(1).default('0.0.0.0'),
  SERVER_PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://mme:mme_password@localhost:5432/mme?schema=public'),

  REDIS_HOST: z.string().min(1).default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_DB: z.coerce.number().int().min(0).default(0),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type AppEnv = z.infer<typeof envSchema>;

export const env: AppEnv = envSchema.parse(process.env);
```

---

## 3. Create `apps/server/src/config/config.service.ts`

```ts
import { env } from './env.js';

export class ConfigService {
  public readonly app = {
    name: env.APP_NAME,
    version: env.APP_VERSION,
    environment: env.NODE_ENV,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
  };

  public readonly server = {
    host: env.SERVER_HOST,
    port: env.SERVER_PORT,
    publicHost: env.SERVER_HOST === '0.0.0.0' ? 'localhost' : env.SERVER_HOST,
    get publicUrl() {
      const host = env.SERVER_HOST === '0.0.0.0' ? 'localhost' : env.SERVER_HOST;
      return `http://${host}:${env.SERVER_PORT}`;
    },
  };

  public readonly database = {
    url: env.DATABASE_URL,
  };

  public readonly redis = {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    db: env.REDIS_DB,
  };

  public readonly logging = {
    level: env.LOG_LEVEL,
  };
}

export const config = new ConfigService();
```

---

## 4. Update `apps/server/src/config/logger.ts`

Replace file with:

```ts
import { config } from './config.service.js';

export function createLoggerConfig() {
  if (config.app.isProduction) {
    return {
      level: config.logging.level,
    };
  }

  return {
    level: config.logging.level,
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

## 5. Update `apps/server/src/routes/health.ts`

Replace file with:

```ts
import type { FastifyInstance } from 'fastify';
import { config } from '../config/config.service.js';

function getHealthPayload() {
  return {
    status: 'ok',
    name: config.app.name,
    version: config.app.version,
    environment: config.app.environment,
    node: process.version,
    uptime: Number(process.uptime().toFixed(2)),
  };
}

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => {
    return getHealthPayload();
  });

  app.get('/api/v1/health', async () => {
    return {
      success: true,
      data: getHealthPayload(),
    };
  });
}
```

---

## 6. Update `apps/server/src/server.ts`

Replace file with:

```ts
import { buildApp } from './app.js';
import { config } from './config/config.service.js';

const app = await buildApp();

try {
  await app.listen({
    host: config.server.host,
    port: config.server.port,
  });

  app.log.info(`MME server running at ${config.server.publicUrl}`);
} catch (error) {
  app.log.error(error, 'Failed to start server');
  process.exit(1);
}
```

---

## 7. Install / Typecheck

```powershell
pnpm install
pnpm --filter @mme/server typecheck
```

---

## 8. Run

```powershell
pnpm dev
```

Open:

```txt
http://localhost:3000/api/v1/health
```

Expected response now includes:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "name": "mikrotik-manager-enterprise",
    "version": "0.1.0",
    "environment": "development",
    "node": "v22.x.x",
    "uptime": 1.23
  }
}
```

---

## 9. Commit

```powershell
git add .
git commit -m "feat(server): add configuration service"
git push
```

---

## Done Criteria

- `.env.example` exists.
- `ConfigService` exists.
- `/api/v1/health` returns `environment`.
- Typecheck passes.
- Commit pushed to `develop`.
