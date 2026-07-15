import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createTransportMock, sendMailMock } = vi.hoisted(() => {
  const sendMail = vi.fn();
  return {
    sendMailMock: sendMail,
    createTransportMock: vi.fn(() => ({ sendMail })),
  };
});

vi.mock('nodemailer', () => ({ default: { createTransport: createTransportMock } }));

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
  beforeEach(() => {
    notificationStore.clear();
    createTransportMock.mockClear();
    sendMailMock.mockReset().mockResolvedValue({ messageId: 'test-message' });
  });
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

  it('sends generic webhook deliveries', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    createDelivery('webhook', { url: 'https://alerts.example.test/mme', method: 'POST' });

    const result = await new NotificationDeliveryWorker().processPending();

    expect(result.sent).toBe(1);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      channelType: 'webhook',
    });
  });

  it('sends SMTP email deliveries', async () => {
    createDelivery('email', {
      host: 'smtp.example.test',
      port: 587,
      user: 'mme',
      password: 'secret',
      from: 'mme@example.test',
      to: 'noc@example.test',
    });

    const result = await new NotificationDeliveryWorker().processPending();

    expect(result.sent).toBe(1);
    expect(createTransportMock).toHaveBeenCalledOnce();
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'mme@example.test', to: 'noc@example.test' }),
    );
  });

  it('records in-app deliveries without an external request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    createDelivery('in_app', {});

    const result = await new NotificationDeliveryWorker().processPending();

    expect(result.sent).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
