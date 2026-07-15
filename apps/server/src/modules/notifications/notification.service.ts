import { auditService } from '../audit/index.js';
import { HttpError } from '../../errors/http-error.js';
import { notificationRuleMatches } from './notification.matching.js';
import { notificationDeliveryWorker } from './notification.delivery.js';
import { mergeNotificationChannelConfig, notificationStore } from './notification.store.js';
import type {
  CreateNotificationChannelInput,
  CreateNotificationRuleInput,
  NotificationDelivery,
  NotificationDeliveryWorkerResult,
  NotificationPayload,
  NotificationRetryResult,
  UpdateNotificationChannelInput,
  UpdateNotificationRuleInput,
} from './notification.types.js';

function text(config: Record<string, unknown>, key: string): string {
  const value = config[key];
  return typeof value === 'string' ? value.trim() : '';
}

function channelRequirements(channel: ReturnType<typeof notificationStore.getChannel>) {
  if (!channel) return { configured: false, missingFields: ['channel'], destination: '—' };
  const required: Record<string, string[]> = {
    email: ['host', 'from', 'to'],
    telegram: ['botToken', 'chatId'],
    slack: ['webhookUrl'],
    webhook: ['url'],
    in_app: [],
  };
  const missingFields = (required[channel.type] ?? []).filter((key) => !text(channel.config, key));
  const configuredDestination =
    channel.type === 'email'
      ? text(channel.config, 'to')
      : channel.type === 'telegram'
        ? text(channel.config, 'chatId')
        : channel.type === 'slack'
          ? 'Slack Incoming Webhook'
          : channel.type === 'webhook'
            ? text(channel.config, 'url')
            : 'MME Web';
  let destination = configuredDestination;
  if (channel.type === 'webhook' && configuredDestination) {
    try {
      const url = new URL(configuredDestination);
      destination = `${url.protocol}//${url.host}`;
    } catch {
      destination = 'Webhook URL';
    }
  }
  return { configured: missingFields.length === 0, missingFields, destination: destination || '—' };
}

function publicConfig(channel: NonNullable<ReturnType<typeof notificationStore.getChannel>>) {
  const secretKeys = new Set([
    'password',
    'botToken',
    'token',
    'authorization',
    'apiKey',
    'webhookUrl',
    'url',
  ]);
  return Object.fromEntries(
    Object.entries(channel.config).map(([key, value]) => {
      if (key === 'headers' && value && typeof value === 'object' && !Array.isArray(value)) {
        return [
          key,
          Object.fromEntries(Object.keys(value).map((headerName) => [headerName, '••••••••'])),
        ];
      }
      return [key, secretKeys.has(key) && typeof value === 'string' && value ? '••••••••' : value];
    }),
  );
}

const notificationActor = {
  type: 'api' as const,
  id: 'notification-api',
  name: 'Notification API',
};

const notificationWorkerActor = {
  type: 'system' as const,
  id: 'notification-worker',
  name: 'Notification Worker',
};

function retryResult(
  requested: number,
  reset: number,
  missing: number,
  workerResult: Awaited<ReturnType<typeof notificationDeliveryWorker.processPending>>,
): NotificationRetryResult {
  return {
    requested,
    reset,
    missing,
    processed: workerResult.processed,
    sent: workerResult.sent,
    failed: workerResult.failed,
    skipped: workerResult.skipped,
    deliveries: workerResult.deliveries,
  };
}

export class NotificationService {
  private describeChannel(channel: NonNullable<ReturnType<typeof notificationStore.getChannel>>) {
    const latest = notificationStore
      .listDeliveries(500)
      .find((delivery) => delivery.channelId === channel.id);
    return {
      ...channel,
      config: publicConfig(channel),
      status: {
        ...channelRequirements(channel),
        lastDeliveryStatus: latest?.status,
        lastAttemptAt: latest?.sentAt ?? latest?.failedAt ?? latest?.skippedAt ?? latest?.createdAt,
        lastError: latest?.error,
      },
    };
  }

  public createChannel(input: CreateNotificationChannelInput) {
    const duplicate = notificationStore.findDuplicateChannel({
      name: input.name,
      type: input.type,
      config: input.config ?? {},
    });
    if (duplicate) {
      throw new HttpError(
        409,
        'NOTIFICATION_CHANNEL_DUPLICATE',
        `Kênh “${duplicate.name}” đã tồn tại. Hãy chỉnh sửa kênh hiện có thay vì tạo lại.`,
      );
    }
    const channel = notificationStore.createChannel(input);

    auditService.logSuccess({
      action: 'notification.channel.created',
      summary: `Notification channel '${channel.name}' was created`,
      actor: notificationActor,
      entity: {
        type: 'notification_channel',
        id: channel.id,
        name: channel.name,
      },
      metadata: {
        channelType: channel.type,
        enabled: channel.enabled,
      },
    });

    return this.describeChannel(channel);
  }

  public listChannels() {
    return notificationStore.listChannels().map((channel) => this.describeChannel(channel));
  }

  public updateChannel(channelId: string, input: UpdateNotificationChannelInput) {
    const before = notificationStore.getChannel(channelId);
    if (before) {
      const candidateConfig = input.config
        ? mergeNotificationChannelConfig(before.config, input.config)
        : before.config;
      const duplicate = notificationStore.findDuplicateChannel({
        id: channelId,
        name: input.name ?? before.name,
        type: before.type,
        config: candidateConfig,
      });
      if (duplicate) {
        throw new HttpError(
          409,
          'NOTIFICATION_CHANNEL_DUPLICATE',
          `Cấu hình này trùng với kênh “${duplicate.name}”.`,
        );
      }
    }
    const channel = notificationStore.updateChannel(channelId, input);

    if (channel) {
      auditService.logSuccess({
        action: 'notification.channel.updated',
        summary: `Notification channel '${channel.name}' was updated`,
        actor: notificationActor,
        entity: {
          type: 'notification_channel',
          id: channel.id,
          name: channel.name,
        },
        metadata: {
          before: before ? this.describeChannel(before) : null,
          after: this.describeChannel(channel),
        },
      });
    } else {
      auditService.logFailure({
        action: 'notification.channel.update_failed',
        summary: `Notification channel '${channelId}' was not found for update`,
        actor: notificationActor,
        entity: {
          type: 'notification_channel',
          id: channelId,
        },
        severity: 'warning',
        metadata: {
          input: {
            name: input.name,
            enabled: input.enabled,
            configKeys: input.config ? Object.keys(input.config) : undefined,
          },
        },
      });
    }

    return channel ? this.describeChannel(channel) : null;
  }

  public deleteChannel(channelId: string) {
    const before = notificationStore.getChannel(channelId);
    const deleted = notificationStore.deleteChannel(channelId);

    if (deleted) {
      auditService.logSuccess({
        action: 'notification.channel.deleted',
        summary: `Notification channel '${before?.name ?? channelId}' was deleted`,
        actor: notificationActor,
        entity: {
          type: 'notification_channel',
          id: channelId,
          name: before?.name,
        },
        severity: 'warning',
        metadata: {
          before: before ? this.describeChannel(before) : null,
        },
      });
    } else {
      auditService.logFailure({
        action: 'notification.channel.delete_failed',
        summary: `Notification channel '${channelId}' was not found for delete`,
        actor: notificationActor,
        entity: {
          type: 'notification_channel',
          id: channelId,
        },
        severity: 'warning',
      });
    }

    return {
      id: channelId,
      deleted,
    };
  }

  public createRule(input: CreateNotificationRuleInput) {
    const duplicate = notificationStore.findDuplicateRule(input);
    if (duplicate) {
      throw new HttpError(
        409,
        'NOTIFICATION_RULE_DUPLICATE',
        `Quy tắc “${duplicate.name}” đã xử lý cùng sự kiện, mức độ và kênh nhận.`,
      );
    }
    const rule = notificationStore.createRule(input);

    auditService.logSuccess({
      action: 'notification.rule.created',
      summary: `Notification rule '${rule.name}' was created`,
      actor: notificationActor,
      entity: {
        type: 'notification_rule',
        id: rule.id,
        name: rule.name,
      },
      metadata: {
        eventTypes: rule.eventTypes,
        severities: rule.severities,
        channelIds: rule.channelIds,
        enabled: rule.enabled,
      },
    });

    return rule;
  }

  public listRules() {
    return notificationStore.listRules();
  }

  public updateRule(ruleId: string, input: UpdateNotificationRuleInput) {
    const before = notificationStore.getRule(ruleId);
    if (before) {
      const duplicate = notificationStore.findDuplicateRule({
        id: ruleId,
        eventTypes: input.eventTypes ?? before.eventTypes,
        severities: input.severities ?? before.severities,
        channelIds: input.channelIds ?? before.channelIds,
      });
      if (duplicate) {
        throw new HttpError(
          409,
          'NOTIFICATION_RULE_DUPLICATE',
          `Quy tắc này trùng với “${duplicate.name}”.`,
        );
      }
    }
    const rule = notificationStore.updateRule(ruleId, input);

    if (rule) {
      auditService.logSuccess({
        action: 'notification.rule.updated',
        summary: `Notification rule '${rule.name}' was updated`,
        actor: notificationActor,
        entity: {
          type: 'notification_rule',
          id: rule.id,
          name: rule.name,
        },
        metadata: {
          before,
          after: rule,
        },
      });
    } else {
      auditService.logFailure({
        action: 'notification.rule.update_failed',
        summary: `Notification rule '${ruleId}' was not found for update`,
        actor: notificationActor,
        entity: {
          type: 'notification_rule',
          id: ruleId,
        },
        severity: 'warning',
        metadata: {
          input,
        },
      });
    }

    return rule;
  }

  public deleteRule(ruleId: string) {
    const before = notificationStore.getRule(ruleId);
    const deleted = notificationStore.deleteRule(ruleId);

    if (deleted) {
      auditService.logSuccess({
        action: 'notification.rule.deleted',
        summary: `Notification rule '${before?.name ?? ruleId}' was deleted`,
        actor: notificationActor,
        entity: {
          type: 'notification_rule',
          id: ruleId,
          name: before?.name,
        },
        severity: 'warning',
        metadata: {
          before,
        },
      });
    } else {
      auditService.logFailure({
        action: 'notification.rule.delete_failed',
        summary: `Notification rule '${ruleId}' was not found for delete`,
        actor: notificationActor,
        entity: {
          type: 'notification_rule',
          id: ruleId,
        },
        severity: 'warning',
      });
    }

    return {
      id: ruleId,
      deleted,
    };
  }

  public listDeliveries(limit?: number) {
    return notificationStore.listDeliveries(limit);
  }

  public summary() {
    return notificationStore.summary();
  }

  public enqueue(payload: NotificationPayload): NotificationDelivery[] {
    const deliveries: NotificationDelivery[] = [];
    const queuedChannelIds = new Set<string>();

    for (const rule of notificationStore.listRules()) {
      if (!notificationRuleMatches(rule, payload)) {
        continue;
      }

      for (const channelId of rule.channelIds) {
        if (queuedChannelIds.has(channelId)) continue;
        const channel = notificationStore.getChannel(channelId);

        if (!channel || !channel.enabled) {
          continue;
        }

        deliveries.push(
          notificationStore.createDelivery({
            ruleId: rule.id,
            channelId: channel.id,
            channelType: channel.type,
            payload,
          }),
        );
        queuedChannelIds.add(channelId);
      }
    }

    if (deliveries.length > 0) {
      auditService.logSuccess({
        action: 'notification.delivery.queued',
        summary: `${deliveries.length} notification delivery item(s) were queued`,
        actor: notificationWorkerActor,
        entity: {
          type: 'notification_delivery',
          id: deliveries[0]?.id,
          name: payload.title,
        },
        metadata: {
          eventType: payload.eventType,
          severity: payload.severity,
          deliveryIds: deliveries.map((delivery) => delivery.id),
        },
      });
    }

    return deliveries;
  }

  public async processPending(limit?: number) {
    const result = await notificationDeliveryWorker.processPending(limit);

    auditService.logSuccess({
      action: 'notification.delivery.process_pending',
      summary: `Notification worker processed ${result.processed} pending delivery item(s)`,
      actor: notificationWorkerActor,
      entity: {
        type: 'notification_delivery',
        id: result.deliveries[0]?.id,
      },
      metadata: {
        result,
      },
    });

    return result;
  }

  public async retryDelivery(deliveryId: string) {
    const result = await notificationDeliveryWorker.processOne(deliveryId);

    auditService.logSuccess({
      action: 'notification.delivery.retry_one',
      summary: `Notification delivery '${deliveryId}' was retried`,
      actor: notificationActor,
      entity: {
        type: 'notification_delivery',
        id: deliveryId,
      },
      metadata: {
        result,
      },
    });

    return result;
  }

  public async testChannel(channelId: string) {
    const channel = notificationStore.getChannel(channelId);
    if (!channel) return null;
    const requirements = channelRequirements(channel);
    const delivery = notificationStore.createDelivery({
      ruleId: 'manual-channel-test',
      channelId: channel.id,
      channelType: channel.type,
      payload: {
        eventType: 'CHANNEL_TEST',
        severity: 'info',
        title: 'MME kiểm thử kênh thông báo',
        message: `Kênh “${channel.name}” đã nhận được thông báo kiểm thử từ MME.`,
        source: 'notification-channel-test',
        createdAt: new Date().toISOString(),
      },
    });
    if (!requirements.configured) {
      const failed = notificationStore.markFailed(
        delivery.id,
        `Kênh còn thiếu cấu hình: ${requirements.missingFields.join(', ')}`,
      );
      return {
        processed: failed ? 1 : 0,
        sent: 0,
        failed: failed ? 1 : 0,
        skipped: 0,
        deliveries: failed ? [failed] : [],
      };
    }
    return notificationDeliveryWorker.processOne(delivery.id, { allowDisabled: true });
  }

  public async testAllChannels(): Promise<NotificationDeliveryWorkerResult> {
    const deliveries: NotificationDelivery[] = [];
    for (const channel of notificationStore.listChannels()) {
      const result = await this.testChannel(channel.id);
      if (result) deliveries.push(...result.deliveries);
    }
    return {
      processed: deliveries.length,
      sent: deliveries.filter((delivery) => delivery.status === 'sent').length,
      failed: deliveries.filter((delivery) => delivery.status === 'failed').length,
      skipped: deliveries.filter((delivery) => delivery.status === 'skipped').length,
      deliveries,
    };
  }

  public async retryFailed(limit = 50): Promise<NotificationRetryResult> {
    const failed = notificationStore.listDeliveriesByStatus('failed', limit);
    const skipped = notificationStore.listDeliveriesByStatus('skipped', limit);
    const retryable = [...failed, ...skipped].slice(0, Math.max(1, Math.min(limit, 500)));
    let reset = 0;

    for (const delivery of retryable) {
      const updated = notificationStore.markPending(delivery.id, 'Retry failed/skipped requested');
      if (updated) reset += 1;
    }

    const workerResult = await notificationDeliveryWorker.processPending(reset);
    const result = retryResult(retryable.length, reset, retryable.length - reset, workerResult);

    auditService.logSuccess({
      action: 'notification.delivery.retry_failed',
      summary: `${result.reset} failed/skipped notification delivery item(s) were retried`,
      actor: notificationActor,
      entity: {
        type: 'notification_delivery',
        id: result.deliveries[0]?.id,
      },
      metadata: {
        result,
      },
    });

    return result;
  }

  public markSent(deliveryId: string) {
    return notificationStore.markSent(deliveryId);
  }

  public markFailed(deliveryId: string, error: string) {
    return notificationStore.markFailed(deliveryId, error);
  }

  public markSkipped(deliveryId: string, reason: string) {
    return notificationStore.markSkipped(deliveryId, reason);
  }

  public seedDefaults() {
    const existingChannels = notificationStore.listChannels();
    const inApp =
      existingChannels.find((channel) => channel.type === 'in_app') ??
      notificationStore.createChannel({
        name: 'Default In-App Notifications',
        type: 'in_app',
        enabled: true,
        config: {},
      });
    const eventTypes = ['ALERT_OPENED', 'ALERT_RESOLVED', 'DEVICE_OFFLINE'];
    const severities = ['critical', 'success'] as const;
    const criticalRule =
      notificationStore.findDuplicateRule({
        eventTypes,
        severities: [...severities],
        channelIds: [inApp.id],
      }) ??
      notificationStore.createRule({
        name: 'Critical Alert Lifecycle Events',
        enabled: true,
        eventTypes,
        severities: [...severities],
        channelIds: [inApp.id],
      });

    void auditService
      .logSuccess({
        action: 'notification.defaults.seeded',
        summary: 'Notification defaults were seeded',
        actor: notificationActor,
        entity: {
          type: 'system',
          id: 'notification-engine',
          name: 'Notification Engine',
        },
        metadata: {
          channelId: inApp.id,
          ruleId: criticalRule.id,
        },
      })
      .catch(() => undefined);

    return {
      channels: notificationStore.listChannels().map((channel) => this.describeChannel(channel)),
      rules: notificationStore.listRules(),
    };
  }
}

export const notificationService = new NotificationService();
