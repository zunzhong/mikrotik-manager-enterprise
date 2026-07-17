import { buildApp } from './app.js';
import { config } from './config/config.service.js';
import { moduleRegistry } from './core/index.js';
import { deviceRealtimeSchedulerService } from './modules/device/application/device-realtime-scheduler.service.js';
import { backupSchedulerService } from './modules/backup/application/backup-scheduler.service.js';

const app = await buildApp();

const shutdown = async () => {
  app.log.info('Shutting down MME server');

  deviceRealtimeSchedulerService.stop();
  backupSchedulerService.stop();
  await moduleRegistry.shutdownAll();
  await app.close();

  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

try {
  await app.listen({
    host: config.server.host,
    port: config.server.port,
  });

  app.log.info(`MME server running at ${config.server.publicUrl}`);
  deviceRealtimeSchedulerService.start({ intervalMs: 10000, ttlMs: 15000 });
  backupSchedulerService.start();
  app.log.info('RouterOS realtime synchronization scheduler started');
} catch (error) {
  app.log.error(error, 'Failed to start server');
  process.exit(1);
}
