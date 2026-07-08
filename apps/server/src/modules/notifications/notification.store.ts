import type {
  CreateNotificationChannelInput,
  CreateNotificationRuleInput,
  NotificationChannel,
  NotificationDelivery,
  NotificationDeliveryStatus,
  NotificationPayload,
  NotificationRule,
  NotificationSummary,
  UpdateNotificationChannelInput,
  UpdateNotificationRuleInput,
} from './notification.types.js';

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeLimit(limit = 100): number {
  return Math.min(Math.max(limit, 1), 500);
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export class NotificationStore {
  private readonly channels = new Map<string, NotificationChannel>();
  private readonly rules = new Map<string, NotificationRule>();
  private readonly deliveries = new Map<string, NotificationDelivery>();

  public createChannel(input: CreateNotificationChannelInput): NotificationChannel {
    const now = nowIso();
    const channel: NotificationChannel = {
      id: createId('channel'),
      name: input.name,
      type: input.type,
      enabled: input.enabled ?? true,
      config: input.config ?? {},
      createdAt: now,
      updatedAt: now,
    };

    this.channels.set(channel.id, channel);
    return channel;
  }

  public listChannels(): NotificationChannel[] {
    return [...this.channels.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  public getChannel(channelId: string): NotificationChannel | null {
    return this.channels.get(channelId) ?? null;
  }

  public updateChannel(
    channelId: string,
    input: UpdateNotificationChannelInput,
  ): NotificationChannel | null {
    const channel = this.channels.get(channelId);
    if (!channel) return null;

    const updated: NotificationChannel = {
      ...channel,
      name: input.name ?? channel.name,
      enabled: input.enabled ?? channel.enabled,
      config: input.config ?? channel.config,
      updatedAt: nowIso(),
    };

    this.channels.set(channelId, updated);
    return updated;
  }

  public deleteChannel(channelId: string): boolean {
    const deleted = this.channels.delete(channelId);

    if (deleted) {
      for (const rule of this.rules.values()) {
        if (!rule.channelIds.includes(channelId)) {
          continue;
        }

        this.rules.set(rule.id, {
          ...rule,
          channelIds: rule.channelIds.filter((id) => id !== channelId),
          updatedAt: nowIso(),
        });
      }
    }

    return deleted;
  }

  public createRule(input: CreateNotificationRuleInput): NotificationRule {
    const now = nowIso();
    const rule: NotificationRule = {
      id: createId('rule'),
      name: input.name,
      enabled: input.enabled ?? true,
      eventTypes: unique(input.eventTypes),
      severities: unique(input.severities),
      channelIds: unique(input.channelIds),
      createdAt: now,
      updatedAt: now,
    };

    this.rules.set(rule.id, rule);
    return rule;
  }

  public listRules(): NotificationRule[] {
    return [...this.rules.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  public getRule(ruleId: string): NotificationRule | null {
    return this.rules.get(ruleId) ?? null;
  }

  public updateRule(ruleId: string, input: UpdateNotificationRuleInput): NotificationRule | null {
    const rule = this.rules.get(ruleId);
    if (!rule) return null;

    const updated: NotificationRule = {
      ...rule,
      name: input.name ?? rule.name,
      enabled: input.enabled ?? rule.enabled,
      eventTypes: input.eventTypes ? unique(input.eventTypes) : rule.eventTypes,
      severities: input.severities ? unique(input.severities) : rule.severities,
      channelIds: input.channelIds ? unique(input.channelIds) : rule.channelIds,
      updatedAt: nowIso(),
    };

    this.rules.set(ruleId, updated);
    return updated;
  }

  public deleteRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  public createDelivery(input: {
    ruleId: string;
    channelId: string;
    channelType: NotificationDelivery['channelType'];
    payload: NotificationPayload;
  }): NotificationDelivery {
    const now = nowIso();
    const delivery: NotificationDelivery = {
      id: createId('delivery'),
      ruleId: input.ruleId,
      channelId: input.channelId,
      channelType: input.channelType,
      status: 'pending',
      payload: input.payload,
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.deliveries.set(delivery.id, delivery);
    return delivery;
  }

  public getDelivery(deliveryId: string): NotificationDelivery | null {
    return this.deliveries.get(deliveryId) ?? null;
  }

  public markPending(deliveryId: string, reason = 'Retry requested'): NotificationDelivery | null {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) return null;

    const updated: NotificationDelivery = {
      ...delivery,
      status: 'pending',
      updatedAt: nowIso(),
      sentAt: undefined,
      failedAt: undefined,
      skippedAt: undefined,
      error: reason,
    };

    this.deliveries.set(deliveryId, updated);
    return updated;
  }

  public markSent(deliveryId: string): NotificationDelivery | null {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) return null;

    const updated: NotificationDelivery = {
      ...delivery,
      status: 'sent',
      attempts: delivery.attempts + 1,
      updatedAt: nowIso(),
      sentAt: nowIso(),
      failedAt: undefined,
      skippedAt: undefined,
      error: undefined,
    };

    this.deliveries.set(deliveryId, updated);
    return updated;
  }

  public markFailed(deliveryId: string, error: string): NotificationDelivery | null {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) return null;

    const updated: NotificationDelivery = {
      ...delivery,
      status: 'failed',
      attempts: delivery.attempts + 1,
      updatedAt: nowIso(),
      failedAt: nowIso(),
      skippedAt: undefined,
      error,
    };

    this.deliveries.set(deliveryId, updated);
    return updated;
  }

  public markSkipped(deliveryId: string, reason: string): NotificationDelivery | null {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) return null;

    const updated: NotificationDelivery = {
      ...delivery,
      status: 'skipped',
      updatedAt: nowIso(),
      skippedAt: nowIso(),
      error: reason,
    };

    this.deliveries.set(deliveryId, updated);
    return updated;
  }

  public listDeliveries(limit = 100): NotificationDelivery[] {
    return [...this.deliveries.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, normalizeLimit(limit));
  }

  public listDeliveriesByStatus(
    status: NotificationDeliveryStatus,
    limit = 100,
  ): NotificationDelivery[] {
    return [...this.deliveries.values()]
      .filter((delivery) => delivery.status === status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, normalizeLimit(limit));
  }

  public countDeliveriesByStatus(status: NotificationDeliveryStatus): number {
    return [...this.deliveries.values()].filter((delivery) => delivery.status === status).length;
  }

  public summary(): NotificationSummary {
    return {
      channels: this.channels.size,
      rules: this.rules.size,
      deliveries: {
        pending: this.countDeliveriesByStatus('pending'),
        sent: this.countDeliveriesByStatus('sent'),
        failed: this.countDeliveriesByStatus('failed'),
        skipped: this.countDeliveriesByStatus('skipped'),
      },
      generatedAt: nowIso(),
    };
  }

  public clear(): void {
    this.channels.clear();
    this.rules.clear();
    this.deliveries.clear();
  }
}

export const notificationStore = new NotificationStore();
