import { buildApp } from './app.js';
import { config } from './config/config.service.js';
import { moduleRegistry } from './core/index.js';

const app = await buildApp();

const shutdown = async () => {
  app.log.info('Shutting down MME server');

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
} catch (error) {
  app.log.error(error, 'Failed to start server');
  process.exit(1);
}
