import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import Fastify from 'fastify';
import { createLoggerConfig } from './config/logger.js';
import {
  alertModule,
  auditModule,
  collectorModule,
  coreRoutes,
  healthModule,
  moduleRegistry,
  schedulerModule,
} from './core/index.js';
import { adminRoutes } from './modules/admin/index.js';
import {
  alertLifecycleRoutes,
  registerAlertLifecycleBridge,
} from './modules/alert-lifecycle/index.js';
import { alertRoutes } from './modules/alerts/index.js';
import { authRoutes } from './modules/auth/index.js';
import { backupRoutes } from './modules/backup/index.js';
import { collectorRoutes } from './modules/collector/index.js';
import { complianceRoutes } from './modules/compliance/index.js';
import { dashboardRoutes } from './modules/dashboard/index.js';
import { deviceRoutes } from './modules/device/index.js';
import { eventRoutes } from './modules/events/index.js';
import { inventoryRoutes } from './modules/inventory/index.js';
import {
  notificationRoutes,
  registerNotificationEventBridge,
} from './modules/notifications/index.js';
import { routerOsApiRoutes } from './modules/routeros-api/index.js';
import { systemRoutes } from './modules/system/index.js';
import { topologyRoutes } from './modules/topology/index.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { healthRoutes } from './routes/health.js';
import { auditRoutes } from './modules/audit/index.js';

export async function buildApp() {
  const app = Fastify({ logger: createLoggerConfig() });

  await registerErrorHandler(app);
  await app.register(cors, { origin: true });
  await app.register(helmet);

  moduleRegistry.register(healthModule);
  moduleRegistry.register(auditModule);
  moduleRegistry.register(schedulerModule);
  moduleRegistry.register(collectorModule);
  moduleRegistry.register(alertModule);

  registerAlertLifecycleBridge();
  registerNotificationEventBridge();

  await app.register(healthRoutes);
  await app.register(eventRoutes);
  await app.register(alertLifecycleRoutes);
  await app.register(notificationRoutes);
  await app.register(authRoutes);
  await app.register(coreRoutes);
  await app.register(adminRoutes);
  await app.register(deviceRoutes);
  await app.register(routerOsApiRoutes);
  await app.register(inventoryRoutes);
  await app.register(complianceRoutes);
  await app.register(collectorRoutes);
  await app.register(alertRoutes);
  await app.register(dashboardRoutes);
  await app.register(backupRoutes);
  await app.register(topologyRoutes);
  await app.register(systemRoutes);

  await moduleRegistry.loadAll(app);
  await app.register(auditRoutes);

  return app;
}
