import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
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

interface PersistedNotificationState {
  version: 1;
  channels: NotificationChannel[];
  rules: NotificationRule[];
  deliveries: NotificationDelivery[];
}

function storePath(): string | null {
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) return null;
  if (process.env.MME_NOTIFICATION_STORE_PATH) {
    return resolve(process.env.MME_NOTIFICATION_STORE_PATH);
  }
  const backupPath = process.env.BACKUP_STORAGE_PATH;
  if (backupPath) return join(dirname(resolve(backupPath)), 'config', 'notifications.json');
  return resolve('data/config/notifications.json');
}

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

const maskedSecret = '••••••••';
const secretConfigKeys = new Set([
  'password',
  'botToken',
  'token',
  'authorization',
  'apiKey',
  'webhookUrl',
  'url',
]);

function normalizedText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizedName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function normalizedUrl(value: unknown): string {
  const raw = normalizedText(value);
  if (!raw) return '';
  try {
    const url = new URL(raw);
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return raw;
  }
}

function normalizedTelegramToken(value: unknown): string {
  const raw = normalizedText(value);
  if (!raw) return '';
  const tokenFromUrl = raw.match(/\/bot([^/]+)(?:\/|$)/i)?.[1];
  return (tokenFromUrl ?? raw).replace(/^bot/i, '').trim();
}

export function notificationChannelIdentity(input: {
  type: NotificationChannel['type'];
  config: Record<string, unknown>;
}): string | null {
  const config = input.config;
  if (input.type === 'in_app') return 'in_app';
  if (input.type === 'telegram') {
    const token = normalizedTelegramToken(config.botToken);
    const chatId = normalizedText(config.chatId);
    return token && chatId ? `telegram:${token}:${chatId}` : null;
  }
  if (input.type === 'email') {
    const host = normalizedText(config.host).toLocaleLowerCase();
    const from = normalizedText(config.from).toLocaleLowerCase();
    const to = normalizedText(config.to).toLocaleLowerCase();
    return host && from && to ? `email:${host}:${from}:${to}` : null;
  }
  if (input.type === 'slack') {
    const url = normalizedUrl(config.webhookUrl);
    return url ? `slack:${url}` : null;
  }
  const url = normalizedUrl(config.url);
  const method = normalizedText(config.method).toUpperCase() || 'POST';
  return url ? `webhook:${method}:${url}` : null;
}

export function mergeNotificationChannelConfig(
  current: Record<string, unknown>,
  update: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...current };
  for (const [key, value] of Object.entries(update)) {
    const isPreservedSecret =
      secretConfigKeys.has(key) &&
      (value === maskedSecret || (typeof value === 'string' && value.trim() === ''));
    if (!isPreservedSecret) merged[key] = value;
  }
  return merged;
}

function ruleIdentity(rule: Pick<NotificationRule, 'eventTypes' | 'severities' | 'channelIds'>) {
  return JSON.stringify({
    eventTypes: [...rule.eventTypes].sort(),
    severities: [...rule.severities].sort(),
    channelIds: [...new Set(rule.channelIds)].sort(),
  });
}

export class NotificationStore {
  private readonly channels = new Map<string, NotificationChannel>();
  private readonly rules = new Map<string, NotificationRule>();
  private readonly deliveries = new Map<string, NotificationDelivery>();
  private readonly path = storePath();

  public constructor() {
    this.hydrate();
  }

  private hydrate(): void {
    if (!this.path || !existsSync(this.path)) return;
    try {
      const state = JSON.parse(readFileSync(this.path, 'utf8')) as PersistedNotificationState;
      for (const channel of state.channels ?? []) this.channels.set(channel.id, channel);
      for (const rule of state.rules ?? []) this.rules.set(rule.id, rule);
      for (const delivery of state.deliveries ?? []) this.deliveries.set(delivery.id, delivery);
      if (this.deduplicate()) this.persist();
    } catch {
      // Tệp hỏng không được phép làm server ngừng chạy; cấu hình mới sẽ thay thế khi người dùng lưu.
    }
  }

  private deduplicate(): boolean {
    let changed = false;
    const replacements = new Map<string, string>();
    const seenChannels = new Map<string, NotificationChannel>();
    const channels = [...this.channels.values()].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    );

    for (const channel of channels) {
      const identity = notificationChannelIdentity(channel);
      if (!identity) continue;
      const existing = seenChannels.get(identity);
      if (!existing) {
        seenChannels.set(identity, channel);
        continue;
      }
      replacements.set(channel.id, existing.id);
      if (channel.enabled && !existing.enabled) {
        const enabled = { ...existing, enabled: true, updatedAt: nowIso() };
        this.channels.set(existing.id, enabled);
        seenChannels.set(identity, enabled);
      }
      this.channels.delete(channel.id);
      changed = true;
    }

    if (replacements.size > 0) {
      for (const [id, rule] of this.rules) {
        const channelIds = unique(
          rule.channelIds
            .map((channelId) => replacements.get(channelId) ?? channelId)
            .filter((channelId) => this.channels.has(channelId)),
        );
        if (channelIds.join('|') !== rule.channelIds.join('|')) {
          this.rules.set(id, { ...rule, channelIds, updatedAt: nowIso() });
        }
      }
      for (const [id, delivery] of this.deliveries) {
        const channelId = replacements.get(delivery.channelId);
        if (channelId) this.deliveries.set(id, { ...delivery, channelId });
      }
    }

    const seenRules = new Map<string, NotificationRule>();
    const rules = [...this.rules.values()].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    );
    for (const rule of rules) {
      const identity = ruleIdentity(rule);
      const existing = seenRules.get(identity);
      if (!existing) {
        seenRules.set(identity, rule);
        continue;
      }
      if (rule.enabled && !existing.enabled) {
        const enabled = { ...existing, enabled: true, updatedAt: nowIso() };
        this.rules.set(existing.id, enabled);
        seenRules.set(identity, enabled);
      }
      this.rules.delete(rule.id);
      changed = true;
    }

    return changed;
  }

  private persist(): void {
    if (!this.path) return;
    mkdirSync(dirname(this.path), { recursive: true });
    const deliveries = [...this.deliveries.values()]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 2000);
    const state: PersistedNotificationState = {
      version: 1,
      channels: [...this.channels.values()],
      rules: [...this.rules.values()],
      deliveries,
    };
    const temporary = `${this.path}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    renameSync(temporary, this.path);
  }

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
    this.persist();
    return channel;
  }

  public listChannels(): NotificationChannel[] {
    return [...this.channels.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  public getChannel(channelId: string): NotificationChannel | null {
    return this.channels.get(channelId) ?? null;
  }

  public findDuplicateChannel(input: {
    id?: string;
    name: string;
    type: NotificationChannel['type'];
    config: Record<string, unknown>;
  }): NotificationChannel | null {
    const identity = notificationChannelIdentity(input);
    const name = normalizedName(input.name);
    return (
      this.listChannels().find(
        (channel) =>
          channel.id !== input.id &&
          (normalizedName(channel.name) === name ||
            (identity !== null && notificationChannelIdentity(channel) === identity)),
      ) ?? null
    );
  }

  public findDuplicateRule(input: {
    id?: string;
    eventTypes: string[];
    severities: NotificationRule['severities'];
    channelIds: string[];
  }): NotificationRule | null {
    const identity = ruleIdentity(input);
    return (
      this.listRules().find((rule) => rule.id !== input.id && ruleIdentity(rule) === identity) ??
      null
    );
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
      config: input.config
        ? mergeNotificationChannelConfig(channel.config, input.config)
        : channel.config,
      updatedAt: nowIso(),
    };

    this.channels.set(channelId, updated);
    this.persist();
    return updated;
  }

  public deleteChannel(channelId: string): boolean {
    const deleted = this.channels.delete(channelId);

    if (deleted) {
      for (const rule of this.rules.values()) {
        if (!rule.channelIds.includes(channelId)) {
          continue;
        }

        const channelIds = rule.channelIds.filter((id) => id !== channelId);
        if (channelIds.length === 0) this.rules.delete(rule.id);
        else this.rules.set(rule.id, { ...rule, channelIds, updatedAt: nowIso() });
      }
    }

    if (deleted) this.persist();
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
    this.persist();
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
    this.persist();
    return updated;
  }

  public deleteRule(ruleId: string): boolean {
    const deleted = this.rules.delete(ruleId);
    if (deleted) this.persist();
    return deleted;
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
    this.persist();
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
    this.persist();
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
    this.persist();
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
    this.persist();
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
    this.persist();
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
    this.persist();
  }
}

export const notificationStore = new NotificationStore();
