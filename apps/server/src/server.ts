import { buildApp } from './app.js';
import { config } from './config/config.service.js';

const app = await buildApp();

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
