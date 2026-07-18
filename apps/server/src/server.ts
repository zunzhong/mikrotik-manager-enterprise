import { buildApp } from './app.js';
import { config } from './config/config.service.js';
import { moduleRegistry } from './core/index.js';
import { deviceRealtimeSchedulerService } from './modules/device/application/device-realtime-scheduler.service.js';
import { backupSchedulerService } from './modules/backup/application/backup-scheduler.service.js';
import { inventorySchedulerService } from './modules/inventory/application/inventory-scheduler.service.js';
import { reportSchedulerService } from './modules/report/index.js';
import { deviceRepository } from './modules/device/infrastructure/device.repository.js';

const app = await buildApp();

const shutdown = async () => {
  app.log.info('Shutting down MME server');

  deviceRealtimeSchedulerService.stop();
  backupSchedulerService.stop();
  inventorySchedulerService.stop();
  reportSchedulerService.stop();
  await moduleRegistry.shutdownAll();
  await app.close();

  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

try {
  const normalizedStatuses = await deviceRepository.normalizeConnectionStatuses();
  if (normalizedStatuses.reachable + normalizedStatuses.unreachable > 0) {
    app.log.info(normalizedStatuses, 'Normalized legacy device connection statuses');
  }
  await app.listen({
    host: config.server.host,
    port: config.server.port,
  });

  app.log.info(`MME server running at ${config.server.publicUrl}`);
  deviceRealtimeSchedulerService.start({ intervalMs: 10000, ttlMs: 15000 });
  backupSchedulerService.start((error) => {
    app.log.error(error, 'Automatic backup scheduler failed');
  });
  inventorySchedulerService.start((error) => {
    app.log.error(error, 'Automatic inventory scheduler failed');
  });
  reportSchedulerService.start((error) => {
    app.log.error(error, 'Periodic Telegram report scheduler failed');
  });
  app.log.info('RouterOS realtime synchronization scheduler started');
  app.log.info('Automatic inventory scheduler started with a 30-minute interval');
  app.log.info('Periodic Telegram report scheduler started');
} catch (error) {
  app.log.error(error, 'Failed to start server');
  process.exit(1);
}
