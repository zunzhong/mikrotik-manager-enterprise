import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import Fastify from 'fastify';
import { createLoggerConfig } from './config/logger.js';
import {
  auditModule,
  coreRoutes,
  healthModule,
  moduleRegistry,
  schedulerModule,
} from './core/index.js';
import { complianceRoutes } from './modules/compliance/index.js';
import { deviceRoutes } from './modules/device/index.js';
import { inventoryRoutes } from './modules/inventory/index.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { healthRoutes } from './routes/health.js';

export async function buildApp() {
  const app = Fastify({ logger: createLoggerConfig() });

  await registerErrorHandler(app);
  await app.register(cors, { origin: true });
  await app.register(helmet);

  moduleRegistry.register(healthModule);
  moduleRegistry.register(auditModule);
  moduleRegistry.register(schedulerModule);

  await app.register(healthRoutes);
  await app.register(coreRoutes);
  await app.register(deviceRoutes);
  await app.register(inventoryRoutes);
  await app.register(complianceRoutes);

  await moduleRegistry.loadAll(app);

  return app;
}
