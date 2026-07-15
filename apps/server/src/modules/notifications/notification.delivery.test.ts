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
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true, result: { message_id: 42 } }), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);
    createDelivery('telegram', {
      botToken: 'https://api.telegram.org/bot123456:ABC/sendMessage',
      chatId: '-100123',
    });

    const result = await new NotificationDeliveryWorker().processPending();

    expect(result.sent).toBe(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/bot123456:ABC/sendMessage');
  });

  it('records Telegram Bot API descriptions when a test fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: false, description: 'Bad Request: chat not found' }), {
          status: 400,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            result: [
              {
                update_id: 350501967,
                message: {
                  chat: { id: 8750544864, type: 'private', first_name: 'Quang' },
                },
              },
            ],
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    createDelivery('telegram', { botToken: '123456:ABC', chatId: '350501967' });

    const result = await new NotificationDeliveryWorker().processPending();

    expect(result.failed).toBe(1);
    expect(result.deliveries[0]?.error).toContain('chat not found');
    expect(result.deliveries[0]?.error).toContain('update_id');
    expect(result.deliveries[0]?.error).toContain('8750544864');
    expect(result.deliveries[0]?.error).toContain('/start');
  });

  it('allows an explicit test for a disabled channel', async () => {
    const channel = notificationStore.createChannel({
      name: 'Disabled in-app',
      type: 'in_app',
      enabled: false,
      config: {},
    });
    const delivery = notificationStore.createDelivery({
      ruleId: 'manual-test',
      channelId: channel.id,
      channelType: channel.type,
      payload,
    });

    const result = await new NotificationDeliveryWorker().processOne(delivery.id, {
      allowDisabled: true,
    });

    expect(result.sent).toBe(1);
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
