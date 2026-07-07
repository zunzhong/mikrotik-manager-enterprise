import { notificationStore } from './notification.store.js';
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

function unsupportedChannelReason(delivery: NotificationDelivery): string {
  return `Delivery channel '${delivery.channelType}' is not implemented yet.`;
}

function getConfigText(
  config: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = config[key];

  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function getConfigNumber(
  config: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
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

function readWebhookConfig(channel: NotificationChannel): WebhookConfig {
  const url = getConfigText(channel.config, 'url');

  if (!url) {
    throw new Error(`Webhook channel '${channel.name}' is missing config.url`);
  }

  const rawMethod = getConfigText(channel.config, 'method')?.toUpperCase();
  const method =
    rawMethod === 'PUT' || rawMethod === 'PATCH' || rawMethod === 'POST'
      ? rawMethod
      : 'POST';

  return {
    url,
    method,
    headers: getConfigHeaders(channel.config),
    timeoutMs: getConfigNumber(channel.config, 'timeoutMs', 10000),
  };
}

function webhookPayload(delivery: NotificationDelivery) {
  return {
    deliveryId: delivery.id,
    ruleId: delivery.ruleId,
    channelId: delivery.channelId,
    channelType: delivery.channelType,
    attempts: delivery.attempts,
    createdAt: delivery.createdAt,
    payload: delivery.payload,
  };
}

export class NotificationDeliveryWorker {
  public async processPending(limit = 50): Promise<NotificationDeliveryWorkerResult> {
    const pending = notificationStore.listDeliveriesByStatus('pending', limit);
    const deliveries: NotificationDelivery[] = [];

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const delivery of pending) {
      try {
        const updated = await this.processDelivery(delivery);

        if (updated) {
          deliveries.push(updated);

          if (updated.status === 'sent') sent += 1;
          if (updated.status === 'failed') failed += 1;
          if (updated.status === 'skipped') skipped += 1;
        }
      } catch (error) {
        const updated = notificationStore.markFailed(
          delivery.id,
          error instanceof Error ? error.message : 'Notification delivery failed',
        );

        if (updated) {
          failed += 1;
          deliveries.push(updated);
        }
      }
    }

    return {
      processed: pending.length,
      sent,
      failed,
      skipped,
      deliveries,
    };
  }

  private async processDelivery(delivery: NotificationDelivery): Promise<NotificationDelivery | null> {
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

    if (!channel.enabled) {
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

    return notificationStore.markSkipped(delivery.id, unsupportedChannelReason(delivery));
  }

  private async deliverWebhook(
    delivery: NotificationDelivery,
    channel: NotificationChannel,
  ): Promise<NotificationDelivery | null> {
    const config = readWebhookConfig(channel);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(config.url, {
        method: config.method,
        headers: {
          'content-type': 'application/json',
          ...config.headers,
        },
        body: JSON.stringify(webhookPayload(delivery)),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        return notificationStore.markFailed(
          delivery.id,
          `Webhook returned HTTP ${response.status}${text ? `: ${text.slice(0, 300)}` : ''}`,
        );
      }

      return notificationStore.markSent(delivery.id);
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const notificationDeliveryWorker = new NotificationDeliveryWorker();
