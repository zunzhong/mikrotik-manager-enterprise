import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationDeliveryWorker } from './notification.delivery.js';
import { notificationStore } from './notification.store.js';
import type { NotificationChannelType } from './notification.types.js';

const payload = {
  eventType: 'DEVICE_OFFLINE',
  severity: 'critical' as const,
  title: 'Router offline',
  message: 'Router R1 is unreachable',
  source: 'test',
  createdAt: new Date().toISOString(),
};

function createDelivery(type: NotificationChannelType, config: Record<string, unknown>) {
  const channel = notificationStore.createChannel({ name: `${type} test`, type, config });
  return notificationStore.createDelivery({
    ruleId: 'rule-test',
    channelId: channel.id,
    channelType: type,
    payload,
  });
}

describe('NotificationDeliveryWorker', () => {
  beforeEach(() => notificationStore.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('sends Slack webhook deliveries', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    createDelivery('slack', { webhookUrl: 'https://hooks.slack.test/services/example' });

    const result = await new NotificationDeliveryWorker().processPending();

    expect(result.sent).toBe(1);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0][0])).toContain('slack.test');
  });

  it('sends Telegram bot deliveries', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    createDelivery('telegram', { botToken: 'token-123', chatId: '-100123' });

    const result = await new NotificationDeliveryWorker().processPending();

    expect(result.sent).toBe(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/bottoken-123/sendMessage');
  });

  it('records a failed delivery when required configuration is missing', async () => {
    createDelivery('telegram', {});

    const result = await new NotificationDeliveryWorker().processPending();

    expect(result.failed).toBe(1);
    expect(result.deliveries[0]?.error).toContain('botToken');
  });
});
