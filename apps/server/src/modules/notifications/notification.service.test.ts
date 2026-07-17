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

  it('includes the selected device in a two-step channel test', async () => {
    const channel = notificationStore.createChannel({
      name: 'Device test channel',
      type: 'in_app',
      config: {},
    });

    await notificationService.testChannel(channel.id, {
      deviceId: 'device-1',
      deviceName: 'Branch Router',
    });

    const delivery = notificationStore.listDeliveries()[0];
    expect(delivery?.payload.deviceId).toBe('device-1');
    expect(delivery?.payload.title).toBe('Branch Router');
  });

  it('routes a device rule only to its explicitly selected channels', () => {
    const selected = notificationStore.createChannel({
      name: 'Selected',
      type: 'in_app',
      config: {},
    });
    notificationStore.createChannel({
      name: 'Not selected',
      type: 'webhook',
      config: { url: 'https://example.test' },
    });
    const payload = {
      eventType: 'ALERT_OPENED',
      severity: 'critical' as const,
      title: 'R1',
      message: 'Interface ether1 changed to Down',
      source: 'test',
      createdAt: new Date().toISOString(),
      metadata: { ruleKey: 'interface.down' },
    };

    expect(
      notificationService.enqueueToChannels(payload, [selected.id]).map((item) => item.channelId),
    ).toEqual([selected.id]);
    expect(notificationService.enqueueToChannels(payload, [])).toHaveLength(0);
  });
});
