import { alertService } from '../../modules/alerts/index.js';
import { eventBus } from '../events/event-bus.js';
import type { CoreEvent } from '../events/event-bus.js';
import type { CoreModule } from './module.types.js';

export const alertModule: CoreModule = {
  name: 'core.alerts',
  version: '0.1.0',
  description: 'Enterprise alert engine',

  load() {
    eventBus.on('job.failed', async (event: CoreEvent) => {
      const payload = event.payload as { id?: string; type?: string; error?: string };

      await alertService.create({
        ruleKey: 'job.failed',
        severity: 'warning',
        title: 'Job failed',
        message: payload.error ?? 'A background job failed',
        source: 'core.jobs',
        metadata: { eventId: event.id, payload },
      });
    });

    eventBus.on('collector.inventory.completed', async (event: CoreEvent) => {
      const payload = event.payload as { deviceId?: string; error?: string; errorCode?: string };

      if (!payload.error && !payload.errorCode) {
        return;
      }

      await alertService.create({
        deviceId: payload.deviceId,
        ruleKey: 'collector.inventory.failed',
        severity: 'critical',
        title: 'Inventory collection failed',
        message: payload.error ?? payload.errorCode ?? 'Inventory collection failed',
        source: 'collector',
        metadata: { eventId: event.id, payload },
      });
    });

    eventBus.on('inventory.diff.created', async (event: CoreEvent) => {
      const payload = event.payload as { deviceId?: string; diffId?: string; changeCount?: number };

      if (!payload.changeCount || payload.changeCount <= 0) {
        return;
      }

      await alertService.create({
        deviceId: payload.deviceId,
        ruleKey: 'inventory.diff.detected',
        severity: 'info',
        title: 'Inventory change detected',
        message: `${payload.changeCount} inventory changes detected`,
        source: 'inventory',
        metadata: { eventId: event.id, payload },
      });
    });

    eventBus.on('compliance.report.created', async (event: CoreEvent) => {
      const payload = event.payload as { deviceId?: string; status?: string; score?: number };

      if (payload.status !== 'failed') {
        return;
      }

      await alertService.create({
        deviceId: payload.deviceId,
        ruleKey: 'compliance.failed',
        severity: 'warning',
        title: 'Compliance failed',
        message: `Compliance scan failed with score ${payload.score ?? 0}`,
        source: 'compliance',
        metadata: { eventId: event.id, payload },
      });
    });
  },
};
