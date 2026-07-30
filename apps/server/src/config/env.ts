import { z } from 'zod';

const envBoolean = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  if (['1', 'true', 'yes', 'on'].includes(value.toLowerCase())) return true;
  if (['0', 'false', 'no', 'off'].includes(value.toLowerCase())) return false;
  return value;
}, z.boolean());

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
  SYSLOG_ENABLED: envBoolean.default(true),
  SYSLOG_UDP_ENABLED: envBoolean.default(true),
  SYSLOG_TCP_ENABLED: envBoolean.default(true),
  SYSLOG_BIND_ADDRESS: z.string().min(1).default('0.0.0.0'),
  SYSLOG_PORT: z.coerce.number().int().min(1).max(65535).default(514),
  SYSLOG_RETENTION_DAYS: z.coerce.number().int().min(1).max(3650).default(30),
  SYSLOG_MAX_RECORDS: z.coerce.number().int().min(1000).max(10000000).default(500000),
  SYSLOG_ACCEPT_UNMATCHED: envBoolean.default(true),
});

export type AppEnv = z.infer<typeof envSchema>;
export const env: AppEnv = envSchema.parse(process.env);
