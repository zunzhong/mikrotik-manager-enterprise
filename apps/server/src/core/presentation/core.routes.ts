import type { FastifyInstance } from 'fastify';
import { moduleRegistry } from '../modules/module-registry.js';

export async function coreRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/core/modules', async () => {
    return {
      success: true,
      data: moduleRegistry.list(),
    };
  });
}
