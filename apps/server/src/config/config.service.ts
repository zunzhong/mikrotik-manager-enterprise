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
    proxyHost:
      env.SERVER_HOST === '0.0.0.0'
        ? '127.0.0.1'
        : env.SERVER_HOST === '::'
          ? '::1'
          : env.SERVER_HOST,
    get publicUrl() {
      const host = env.SERVER_HOST === '0.0.0.0' ? 'localhost' : env.SERVER_HOST;
      return `http://${host}:${env.SERVER_PORT}`;
    },
  };

  public readonly frontend = {
    host: env.FRONTEND_HOST ?? env.SERVER_HOST,
    port: env.FRONTEND_PORT ?? env.SERVER_PORT,
    get publicUrl() {
      const configuredHost = env.FRONTEND_HOST ?? env.SERVER_HOST;
      const host = configuredHost === '0.0.0.0' ? 'localhost' : configuredHost;
      return `http://${host}:${env.FRONTEND_PORT ?? env.SERVER_PORT}`;
    },
    separateListener: (env.FRONTEND_PORT ?? env.SERVER_PORT) !== env.SERVER_PORT,
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

  public readonly syslog = {
    enabled: env.SYSLOG_ENABLED,
    udpEnabled: env.SYSLOG_UDP_ENABLED,
    tcpEnabled: env.SYSLOG_TCP_ENABLED,
    bindAddress: env.SYSLOG_BIND_ADDRESS,
    port: env.SYSLOG_PORT,
    retentionDays: env.SYSLOG_RETENTION_DAYS,
    maxRecords: env.SYSLOG_MAX_RECORDS,
    acceptUnmatched: env.SYSLOG_ACCEPT_UNMATCHED,
  };
}

export const config = new ConfigService();
