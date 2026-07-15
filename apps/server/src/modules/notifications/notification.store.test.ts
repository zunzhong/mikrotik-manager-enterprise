import { beforeEach, describe, expect, it } from 'vitest';
import {
  mergeNotificationChannelConfig,
  notificationChannelIdentity,
  notificationStore,
} from './notification.store.js';

describe('NotificationStore channel safety', () => {
  beforeEach(() => notificationStore.clear());

  it('normalizes raw and full-URL Telegram bot tokens to one destination identity', () => {
    const raw = notificationChannelIdentity({
      type: 'telegram',
      config: { botToken: '123456:ABC', chatId: '-100123' },
    });
    const fullUrl = notificationChannelIdentity({
      type: 'telegram',
      config: {
        botToken: 'https://api.telegram.org/bot123456:ABC/sendMessage',
        chatId: '-100123',
      },
    });

    expect(fullUrl).toBe(raw);
  });

  it('preserves a stored secret when an edit submits an empty or masked value', () => {
    expect(
      mergeNotificationChannelConfig(
        { botToken: 'secret-token', chatId: 'old' },
        { botToken: '', chatId: 'new' },
      ),
    ).toEqual({ botToken: 'secret-token', chatId: 'new' });
    expect(
      mergeNotificationChannelConfig({ password: 'secret' }, { password: '••••••••' }),
    ).toEqual({ password: 'secret' });
  });

  it('detects a duplicate configured Telegram destination even when its name differs', () => {
    const existing = notificationStore.createChannel({
      name: 'Telegram NOC',
      type: 'telegram',
      config: { botToken: '123456:ABC', chatId: '-100123' },
    });

    expect(
      notificationStore.findDuplicateChannel({
        name: 'Telegram second copy',
        type: 'telegram',
        config: {
          botToken: 'https://api.telegram.org/bot123456:ABC/sendMessage',
          chatId: '-100123',
        },
      })?.id,
    ).toBe(existing.id);
  });

  it('removes an orphan rule when its only destination channel is deleted', () => {
    const channel = notificationStore.createChannel({
      name: 'Webhook NOC',
      type: 'webhook',
      config: { url: 'https://alerts.example.test/mme' },
    });
    notificationStore.createRule({
      name: 'Critical events',
      eventTypes: ['ALERT_OPENED'],
      severities: ['critical'],
      channelIds: [channel.id],
    });

    expect(notificationStore.deleteChannel(channel.id)).toBe(true);
    expect(notificationStore.listRules()).toHaveLength(0);
  });
});
