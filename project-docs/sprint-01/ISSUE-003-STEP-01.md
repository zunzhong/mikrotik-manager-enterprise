# ISSUE-003 / STEP-01 — Backend Foundation

## Goal

Initialize the backend application using:

- Fastify
- TypeScript
- Pino logger
- Zod environment validation
- `/health` API endpoint

After this step, the backend must run at:

```txt
http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok",
  "name": "mikrotik-manager-enterprise",
  "version": "0.1.0",
  "node": "v22.x.x",
  "uptime": 12.34
}
```

---

## 1. Create these files

### FILE: `apps/server/package.json`

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
    "tsx": "^4.19.2",
    "typescript": "^5.7.3"
  }
}
```

### FILE: `apps/server/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### FILE: `apps/server/src/config/env.ts`

```ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SERVER_HOST: z.string().default('0.0.0.0'),
  SERVER_PORT: z.coerce.number().int().positive().default(3000),
  APP_NAME: z.string().default('mikrotik-manager-enterprise'),
  APP_VERSION: z.string().default('0.1.0')
});

export type AppEnv = z.infer<typeof envSchema>;

export const env: AppEnv = envSchema.parse(process.env);
```

### FILE: `apps/server/src/routes/health.ts`

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
      uptime: Number(process.uptime().toFixed(2))
    };
  });
}
```

### FILE: `apps/server/src/app.ts`

```ts
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import Fastify from 'fastify';
import { healthRoutes } from './routes/health.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info'
    }
  });

  await app.register(cors, {
    origin: true
  });

  await app.register(helmet);

  await app.register(healthRoutes);

  return app;
}
```

### FILE: `apps/server/src/server.ts`

```ts
import { buildApp } from './app.js';
import { env } from './config/env.js';

const app = await buildApp();

try {
  await app.listen({
    host: env.SERVER_HOST,
    port: env.SERVER_PORT
  });

  app.log.info(`MME server running at http://${env.SERVER_HOST}:${env.SERVER_PORT}`);
} catch (error) {
  app.log.error(error, 'Failed to start server');
  process.exit(1);
}
```

---

## 2. Update root `package.json`

Replace your root `package.json` with this:

```json
{
  "name": "mikrotik-manager-enterprise",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@11.9.0",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "dev": "pnpm --filter @mme/server dev",
    "build": "pnpm -r build",
    "typecheck": "pnpm -r typecheck",
    "lint": "echo \"lint will be added in next step\"",
    "format": "echo \"format will be added in next step\"",
    "test": "echo \"tests will be added later\""
  }
}
```

---

## 3. Install

Run from repo root:

```powershell
pnpm install
```

---

## 4. Start backend

```powershell
pnpm dev
```

---

## 5. Test

Open:

```txt
http://localhost:3000/health
```

Or PowerShell:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

---

## 6. Commit

```powershell
git add .
git commit -m "feat(server): initialize backend foundation"
git push
```

---

## Done Criteria

- `pnpm install` works.
- `pnpm dev` starts Fastify server.
- `/health` returns JSON.
- Code committed and pushed to `develop`.
