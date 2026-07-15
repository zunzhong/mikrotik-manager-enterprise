import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../audit/index.js', () => ({
  auditService: {
    logSuccess: vi.fn().mockResolvedValue(undefined),
    logFailure: vi.fn().mockResolvedValue(undefined),
  },
}));
import { notificationService } from './notification.service.js';
import { notificationStore } from './notification.store.js';

describe('NotificationService delivery routing', () => {
  beforeEach(() => notificationStore.clear());

  it('queues only one delivery per channel when overlapping rules match the same event', () => {
    const channel = notificationStore.createChannel({
      name: 'In-app NOC',
      type: 'in_app',
      config: {},
    });
    for (const name of ['Offline rule', 'Critical rule']) {
      notificationStore.createRule({
        name,
        eventTypes: ['DEVICE_OFFLINE'],
        severities: ['critical'],
        channelIds: [channel.id],
      });
    }

    const deliveries = notificationService.enqueue({
      eventType: 'DEVICE_OFFLINE',
      severity: 'critical',
      title: 'Router offline',
      message: 'R1 is unreachable',
      source: 'test',
      createdAt: new Date().toISOString(),
    });

    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]?.channelId).toBe(channel.id);
  });

  it('tests a disabled channel explicitly and records the result', async () => {
    const channel = notificationStore.createChannel({
      name: 'Disabled in-app',
      type: 'in_app',
      enabled: false,
      config: {},
    });

    const result = await notificationService.testChannel(channel.id);

    expect(result?.sent).toBe(1);
    expect(notificationStore.listDeliveries()).toHaveLength(1);
  });
});
