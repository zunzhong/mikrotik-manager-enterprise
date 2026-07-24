import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().min(1).default('mikrotik-manager-enterprise'),
  APP_VERSION: z.string().min(1).default('0.1.0'),
  SERVER_HOST: z.string().min(1).default('0.0.0.0'),
  SERVER_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  FRONTEND_HOST: z.string().min(1).optional(),
  FRONTEND_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://mme:mme_password@localhost:5432/mme?schema=public'),
  REDIS_HOST: z.string().min(1).default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_DB: z.coerce.number().int().min(0).default(0),
  ENCRYPTION_KEY: z.string().min(16).default('change-me-32-byte-minimum-secret-key'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  WEB_DIST_PATH: z.string().optional(),
  PRISMA_POSTGRESQL_CLIENT_PATH: z.string().optional(),
  PRISMA_POSTGRESQL_SCHEMA: z.string().optional(),
  PRISMA_MYSQL_CLIENT_PATH: z.string().optional(),
  PRISMA_MYSQL_SCHEMA: z.string().optional(),
  PRISMA_CLI_PATH: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;
export const env: AppEnv = envSchema.parse(process.env);
