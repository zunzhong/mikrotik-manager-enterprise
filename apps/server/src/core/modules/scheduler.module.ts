import { eventBus } from '../events/event-bus.js';
import { jobQueue } from '../jobs/job-queue.js';
import { scheduler } from '../scheduler/scheduler.js';
import type { CoreModule } from './module.types.js';

export const schedulerModule: CoreModule = {
  name: 'core.scheduler',
  version: '0.1.0',
  description: 'Core scheduler and worker foundation',

  async load() {
    jobQueue.registerHandler('core.noop', async (job) => {
      await eventBus.emit('core.noop.executed', {
        jobId: job.id,
      });
    });

    scheduler.register({
      id: 'core-heartbeat',
      name: 'Core heartbeat',
      jobType: 'core.noop',
      intervalMs: 60_000,
      enabled: true,
    });

    scheduler.start();
  },

  async registerRoutes({ app }) {
    app.get('/api/v1/core/jobs', async () => {
      return {
        success: true,
        data: jobQueue.list(),
      };
    });

    app.post('/api/v1/core/jobs/noop', async (request, reply) => {
      const job = await jobQueue.enqueue('core.noop', {
        manual: true,
      });

      return reply.status(201).send({
        success: true,
        data: job,
      });
    });

    app.get('/api/v1/core/schedules', async () => {
      return {
        success: true,
        data: scheduler.list(),
      };
    });
  },

  async shutdown() {
    scheduler.stop();
  },
};
