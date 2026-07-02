import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import Fastify from 'fastify';
import { createLoggerConfig } from './config/logger.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { healthRoutes } from './routes/health.js';

export async function buildApp() {
  const app = Fastify({
    logger: createLoggerConfig()
  });

  await registerErrorHandler(app);

  await app.register(cors, {
    origin: true
  });

  await app.register(helmet);

  await app.register(healthRoutes);

  return app;
}