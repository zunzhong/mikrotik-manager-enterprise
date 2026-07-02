import { env } from './env.js';

export function createLoggerConfig() {
  if (env.NODE_ENV === 'production') {
    return {
      level: process.env.LOG_LEVEL ?? 'info'
    };
  }

  return {
    level: process.env.LOG_LEVEL ?? 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  };
}