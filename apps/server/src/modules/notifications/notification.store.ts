import type {
  CreateNotificationChannelInput,
  CreateNotificationRuleInput,
  NotificationChannel,
  NotificationDelivery,
  NotificationPayload,
  NotificationRule,
} from './notification.types.js';

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
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

  public createRule(input: CreateNotificationRuleInput): NotificationRule {
    const now = nowIso();
    const rule: NotificationRule = {
      id: createId('rule'),
      name: input.name,
      enabled: input.enabled ?? true,
      eventTypes: [...new Set(input.eventTypes)],
      severities: [...new Set(input.severities)],
      channelIds: [...new Set(input.channelIds)],
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

  public markSent(deliveryId: string): NotificationDelivery | null {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) return null;

    const updated: NotificationDelivery = {
      ...delivery,
      status: 'sent',
      attempts: delivery.attempts + 1,
      updatedAt: nowIso(),
      sentAt: nowIso(),
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
      error,
    };

    this.deliveries.set(deliveryId, updated);

    return updated;
  }

  public listDeliveries(limit = 100): NotificationDelivery[] {
    return [...this.deliveries.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, Math.min(Math.max(limit, 1), 500));
  }

  public clear(): void {
    this.channels.clear();
    this.rules.clear();
    this.deliveries.clear();
  }
}

export const notificationStore = new NotificationStore();
