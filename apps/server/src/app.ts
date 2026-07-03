import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import Fastify from 'fastify';
import { createLoggerConfig } from './config/logger.js';
import { coreRoutes, healthModule, moduleRegistry } from './core/index.js';
import { deviceRoutes } from './modules/device/index.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { healthRoutes } from './routes/health.js';

export async function buildApp() {
  const app = Fastify({ logger: createLoggerConfig() });

  await registerErrorHandler(app);
  await app.register(cors, { origin: true });
  await app.register(helmet);

  moduleRegistry.register(healthModule);

  await app.register(healthRoutes);
  await app.register(coreRoutes);
  await app.register(deviceRoutes);

  await moduleRegistry.loadAll(app);

  return app;
}
