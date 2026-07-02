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
