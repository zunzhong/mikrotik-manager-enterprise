import { config } from '../../config/config.service.js';
import { prismaService } from '../../database/index.js';
import { eventBus } from '../events/event-bus.js';
import type { CoreModule } from './module.types.js';

export const healthModule: CoreModule = {
  name: 'core.health',
  version: '0.1.0',
  description: 'Core platform health module',

  async registerRoutes({ app }) {
    app.get('/api/v1/core/health', async () => {
      const database = await prismaService.healthCheck();

      return {
        success: true,
        data: {
          app: config.app.name,
          version: config.app.version,
          environment: config.app.environment,
          uptime: Number(process.uptime().toFixed(2)),
          database,
        },
      };
    });

    app.get('/api/v1/core/events', async () => {
      return {
        success: true,
        data: eventBus.getRecentEvents(),
      };
    });
  },
};
