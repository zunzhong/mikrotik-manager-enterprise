import { notificationStore } from './notification.store.js';
import nodemailer from 'nodemailer';
import { systemPreferencesService } from '../system/application/system-preferences.service.js';
import type {
  NotificationChannel,
  NotificationDelivery,
  NotificationDeliveryWorkerResult,
} from './notification.types.js';

interface WebhookConfig {
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers: Record<string, string>;
  timeoutMs: number;
}

function getConfigBoolean(
  config: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean {
  const value = config[key];
  return typeof value === 'boolean' ? value : fallback;
}

function unsupportedChannelReason(delivery: NotificationDelivery): string {
  return `Delivery channel '${delivery.channelType}' is not implemented yet.`;
}

function getConfigText(config: Record<string, unknown>, key: string): string | undefined {
  const value = config[key];

  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function telegramBotToken(config: Record<string, unknown>): string | undefined {
  const raw = getConfigText(config, 'botToken');
  if (!raw) return undefined;
  const fromUrl = raw.match(/\/bot([^/]+)(?:\/|$)/i)?.[1];
  return (fromUrl ?? raw).replace(/^bot/i, '').trim() || undefined;
}

function externalRequestError(channel: NotificationChannel, error: unknown): Error {
  if (error instanceof Error && error.name === 'AbortError') {
    return new Error(`Kênh “${channel.name}” hết thời gian chờ kết nối.`);
  }
  const cause = (error as { cause?: { code?: string; message?: string } } | null)?.cause;
  const detail =
    cause?.code ?? cause?.message ?? (error instanceof Error ? error.message : 'unknown');
  return new Error(
    `Không thể kết nối kênh “${channel.name}” (${detail}). Kiểm tra Internet, DNS và firewall outbound của máy chạy MME.`,
  );
}

function getConfigNumber(config: Record<string, unknown>, key: string, fallback: number): number {
  const value = config[key];

  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  return fallback;
}

function getConfigHeaders(config: Record<string, unknown>): Record<string, string> {
  const value = config.headers;

  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return {};
  }

  const headers: Record<string, string> = {};

  for (const [key, headerValue] of Object.entries(value as Record<string, unknown>)) {
    if (typeof headerValue === 'string') {
      headers[key] = headerValue;
    }
  }

  return headers;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function readWebhookConfig(channel: NotificationChannel): WebhookConfig {
  const url = getConfigText(channel.config, 'url');

  if (!url) {
    throw new Error(`Webhook channel '${channel.name}' is missing config.url`);
  }

  const rawMethod = getConfigText(channel.config, 'method')?.toUpperCase();
  const method =
    rawMethod === 'PUT' || rawMethod === 'PATCH' || rawMethod === 'POST' ? rawMethod : 'POST';

  return {
    url,
    method,
    headers: getConfigHeaders(channel.config),
    timeoutMs: getConfigNumber(channel.config, 'timeoutMs', 10000),
  };
}

function webhookPayload(delivery: NotificationDelivery) {
  const preferences = systemPreferencesService.get();
  return {
    deliveryId: delivery.id,
    ruleId: delivery.ruleId,
    channelId: delivery.channelId,
    channelType: delivery.channelType,
    attempts: delivery.attempts,
    createdAt: delivery.createdAt,
    timeZone: preferences.timeZone,
    localCreatedAt: formatDeliveryTime(delivery.payload.createdAt),
    payload: delivery.payload,
  };
}

function formatDeliveryTime(value: string): string {
  const preferences = systemPreferencesService.get();
  return new Intl.DateTimeFormat(preferences.language === 'en' ? 'en-US' : 'vi-VN', {
    timeZone: preferences.timeZone,
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value));
}

function textPayload(delivery: NotificationDelivery): string {
  return `[${delivery.payload.severity.toUpperCase()}] ${delivery.payload.title}\n${delivery.payload.message}\n${formatDeliveryTime(delivery.payload.createdAt)} (${systemPreferencesService.get().timeZone})`;
}

function emptyResult(): NotificationDeliveryWorkerResult {
  return {
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    deliveries: [],
  };
}

function summarize(deliveries: NotificationDelivery[]): NotificationDeliveryWorkerResult {
  return {
    processed: deliveries.length,
    sent: deliveries.filter((delivery) => delivery.status === 'sent').length,
    failed: deliveries.filter((delivery) => delivery.status === 'failed').length,
    skipped: deliveries.filter((delivery) => delivery.status === 'skipped').length,
    deliveries,
  };
}

export class NotificationDeliveryWorker {
  public async processPending(limit = 50): Promise<NotificationDeliveryWorkerResult> {
    const pending = notificationStore.listDeliveriesByStatus('pending', limit);

    if (pending.length === 0) {
      return emptyResult();
    }

    const deliveries: NotificationDelivery[] = [];

    for (const delivery of pending) {
      const updated = await this.processDeliveryWithCatch(delivery);
      if (updated) deliveries.push(updated);
    }

    return summarize(deliveries);
  }

  public async processOne(
    deliveryId: string,
    options: { allowDisabled?: boolean } = {},
  ): Promise<NotificationDeliveryWorkerResult> {
    const delivery = notificationStore.getDelivery(deliveryId);

    if (!delivery) {
      return emptyResult();
    }

    const pending =
      delivery.status === 'pending'
        ? delivery
        : notificationStore.markPending(delivery.id, 'Manual retry requested');

    if (!pending) {
      return emptyResult();
    }

    const updated = await this.processDeliveryWithCatch(pending, options.allowDisabled ?? false);

    return updated ? summarize([updated]) : emptyResult();
  }

  private async processDeliveryWithCatch(
    delivery: NotificationDelivery,
    allowDisabled = false,
  ): Promise<NotificationDelivery | null> {
    try {
      return await this.processDelivery(delivery, allowDisabled);
    } catch (error) {
      return notificationStore.markFailed(
        delivery.id,
        error instanceof Error ? error.message : 'Notification delivery failed',
      );
    }
  }

  private async processDelivery(
    delivery: NotificationDelivery,
    allowDisabled = false,
  ): Promise<NotificationDelivery | null> {
    if (delivery.status !== 'pending') {
      return delivery;
    }

    const channel = notificationStore.getChannel(delivery.channelId);

    if (!channel) {
      return notificationStore.markSkipped(
        delivery.id,
        `Notification channel '${delivery.channelId}' was not found.`,
      );
    }

    if (!channel.enabled && !allowDisabled) {
      return notificationStore.markSkipped(
        delivery.id,
        `Notification channel '${channel.name}' is disabled.`,
      );
    }

    if (delivery.channelType === 'in_app') {
      return notificationStore.markSent(delivery.id);
    }

    if (delivery.channelType === 'webhook') {
      return this.deliverWebhook(delivery, channel);
    }

    if (delivery.channelType === 'slack') {
      return this.deliverSlack(delivery, channel);
    }

    if (delivery.channelType === 'telegram') {
      return this.deliverTelegram(delivery, channel);
    }

    if (delivery.channelType === 'email') {
      return this.deliverEmail(delivery, channel);
    }

    return notificationStore.markSkipped(delivery.id, unsupportedChannelReason(delivery));
  }

  private async deliverWebhook(
    delivery: NotificationDelivery,
    channel: NotificationChannel,
  ): Promise<NotificationDelivery | null> {
    const config = readWebhookConfig(channel);
    let response: Response;
    try {
      response = await fetchWithTimeout(
        config.url,
        {
          method: config.method,
          headers: {
            'content-type': 'application/json',
            ...config.headers,
          },
          body: JSON.stringify(webhookPayload(delivery)),
        },
        config.timeoutMs,
      );
    } catch (error) {
      throw externalRequestError(channel, error);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return notificationStore.markFailed(
        delivery.id,
        `Webhook returned HTTP ${response.status}${text ? `: ${text.slice(0, 300)}` : ''}`,
      );
    }

    return notificationStore.markSent(delivery.id);
  }

  private async deliverSlack(
    delivery: NotificationDelivery,
    channel: NotificationChannel,
  ): Promise<NotificationDelivery | null> {
    const url = getConfigText(channel.config, 'webhookUrl');
    if (!url) throw new Error(`Slack channel '${channel.name}' is missing config.webhookUrl`);

    let response: Response;
    try {
      response = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: textPayload(delivery) }),
        },
        getConfigNumber(channel.config, 'timeoutMs', 10000),
      );
    } catch (error) {
      throw externalRequestError(channel, error);
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `Slack webhook returned HTTP ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`,
      );
    }

    return notificationStore.markSent(delivery.id);
  }

  private async deliverTelegram(
    delivery: NotificationDelivery,
    channel: NotificationChannel,
  ): Promise<NotificationDelivery | null> {
    const botToken = telegramBotToken(channel.config);
    const chatId = getConfigText(channel.config, 'chatId');
    if (!botToken || !chatId) {
      throw new Error(
        `Telegram channel '${channel.name}' requires config.botToken and config.chatId`,
      );
    }

    let response: Response;
    try {
      response = await fetchWithTimeout(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: textPayload(delivery),
            disable_web_page_preview: true,
          }),
        },
        getConfigNumber(channel.config, 'timeoutMs', 15000),
      );
    } catch (error) {
      throw externalRequestError(channel, error);
    }

    const body = (await response.json().catch(() => null)) as {
      ok?: boolean;
      description?: string;
      result?: { message_id?: number };
    } | null;
    if (!response.ok || body?.ok !== true || !body.result?.message_id) {
      throw new Error(
        `Telegram không gửi được (HTTP ${response.status}): ${body?.description ?? 'phản hồi không hợp lệ từ Bot API'}. Kiểm tra Bot Token, Chat ID và hãy nhắn /start cho bot trước khi kiểm thử.`,
      );
    }

    return notificationStore.markSent(delivery.id);
  }

  private async deliverEmail(
    delivery: NotificationDelivery,
    channel: NotificationChannel,
  ): Promise<NotificationDelivery | null> {
    const host = getConfigText(channel.config, 'host');
    const from = getConfigText(channel.config, 'from');
    const to = getConfigText(channel.config, 'to');
    if (!host || !from || !to) {
      throw new Error(
        `Email channel '${channel.name}' requires config.host, config.from and config.to`,
      );
    }

    const user = getConfigText(channel.config, 'user');
    const password = getConfigText(channel.config, 'password');
    const transporter = nodemailer.createTransport({
      host,
      port: getConfigNumber(channel.config, 'port', 587),
      secure: getConfigBoolean(channel.config, 'secure', false),
      connectionTimeout: getConfigNumber(channel.config, 'connectionTimeoutMs', 10000),
      greetingTimeout: getConfigNumber(channel.config, 'greetingTimeoutMs', 10000),
      socketTimeout: getConfigNumber(channel.config, 'socketTimeoutMs', 15000),
      tls: {
        rejectUnauthorized: getConfigBoolean(channel.config, 'tlsRejectUnauthorized', true),
      },
      ...(user && password ? { auth: { user, pass: password } } : {}),
    });

    try {
      await transporter.sendMail({
        from,
        to,
        subject: `[MME][${delivery.payload.severity.toUpperCase()}] ${delivery.payload.title}`,
        text: `${delivery.payload.message}\n\nNguồn: ${delivery.payload.source}\nThời gian: ${formatDeliveryTime(delivery.payload.createdAt)} (${systemPreferencesService.get().timeZone})`,
        ...(getConfigText(channel.config, 'replyTo')
          ? { replyTo: getConfigText(channel.config, 'replyTo') }
          : {}),
      });
    } catch (error) {
      throw externalRequestError(channel, error);
    }

    return notificationStore.markSent(delivery.id);
  }
}

export const notificationDeliveryWorker = new NotificationDeliveryWorker();
