import { eventBus } from '../events/event-bus.js';
import { auditService } from '../audit/audit.service.js';
import type { CoreEvent } from '../events/event-bus.js';
import type { CoreModule } from './module.types.js';

const AUDITED_EVENTS = new Set([
  'job.created',
  'job.started',
  'job.completed',
  'job.failed',
  'job.retry',
  'schedule.triggered',
]);

export const auditModule: CoreModule = {
  name: 'core.audit',
  version: '0.1.0',
  description: 'Core audit log module',

  async load() {
    for (const eventType of AUDITED_EVENTS) {
      eventBus.on(eventType, async (event: CoreEvent) => {
        await auditService.write({
          action: event.type,
          entity: this.getEntityFromEvent(event.type),
          entityId: this.getEntityId(event.payload),
          metadata: {
            eventId: event.id,
            payload: event.payload,
          },
        });
      });
    }
  },

  async registerRoutes({ app }) {
    app.get('/api/v1/core/audit-logs', async () => {
      return {
        success: true,
        data: await auditService.list(),
      };
    });
  },

  getEntityFromEvent(eventType: string): string {
    if (eventType.startsWith('job.')) {
      return 'job';
    }

    if (eventType.startsWith('schedule.')) {
      return 'schedule';
    }

    return 'core';
  },

  getEntityId(payload: unknown): string | undefined {
    if (typeof payload !== 'object' || payload === null) {
      return undefined;
    }

    const maybePayload = payload as { id?: unknown };

    return typeof maybePayload.id === 'string' ? maybePayload.id : undefined;
  },
} as CoreModule & {
  getEntityFromEvent(eventType: string): string;
  getEntityId(payload: unknown): string | undefined;
};
