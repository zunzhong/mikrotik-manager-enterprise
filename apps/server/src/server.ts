import { buildApp } from './app.js';
import { env } from './config/env.js';

const app = await buildApp();

try {
  await app.listen({
    host: env.SERVER_HOST,
    port: env.SERVER_PORT
  });

  const displayHost = env.SERVER_HOST === '0.0.0.0' ? 'localhost' : env.SERVER_HOST;
  app.log.info(`MME server running at http://${displayHost}:${env.SERVER_PORT}`);
} catch (error) {
  app.log.error(error, 'Failed to start server');
  process.exit(1);
}