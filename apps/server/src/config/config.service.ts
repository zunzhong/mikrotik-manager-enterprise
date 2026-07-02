import { env } from './env.js';

/**
 * ConfigService
 *
 * Provides typed access to all application configuration.
 * No other file should read process.env directly.
 */
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
