import { auditService } from '../audit/index.js';
import { notificationRuleMatches } from './notification.matching.js';
import { notificationDeliveryWorker } from './notification.delivery.js';
import { notificationStore } from './notification.store.js';
import type {
  CreateNotificationChannelInput,
  CreateNotificationRuleInput,
  NotificationDelivery,
  NotificationPayload,
  NotificationRetryResult,
  UpdateNotificationChannelInput,
  UpdateNotificationRuleInput,
} from './notification.types.js';

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
  public createChannel(input: CreateNotificationChannelInput) {
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

    return channel;
  }

  public listChannels() {
    return notificationStore.listChannels();
  }

  public updateChannel(channelId: string, input: UpdateNotificationChannelInput) {
    const before = notificationStore.getChannel(channelId);
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
          before,
          after: channel,
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
          input,
        },
      });
    }

    return channel;
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
          before,
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

    for (const rule of notificationStore.listRules()) {
      if (!notificationRuleMatches(rule, payload)) {
        continue;
      }

      for (const channelId of rule.channelIds) {
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

    if (existingChannels.length > 0) {
      void auditService
        .logSuccess({
          action: 'notification.defaults.seed_skipped',
          summary: 'Notification defaults already exist, seed skipped',
          actor: notificationActor,
          entity: {
            type: 'system',
            id: 'notification-engine',
            name: 'Notification Engine',
          },
          metadata: {
            channels: existingChannels.length,
            rules: notificationStore.listRules().length,
          },
        })
        .catch(() => undefined);

      return {
        channels: existingChannels,
        rules: notificationStore.listRules(),
      };
    }

    const inApp = notificationStore.createChannel({
      name: 'Default In-App Notifications',
      type: 'in_app',
      enabled: true,
      config: {},
    });

    const criticalRule = notificationStore.createRule({
      name: 'Critical Alert Lifecycle Events',
      enabled: true,
      eventTypes: ['ALERT_OPENED', 'ALERT_RESOLVED', 'DEVICE_OFFLINE'],
      severities: ['critical', 'success'],
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
      channels: [inApp],
      rules: [criticalRule],
    };
  }
}

export const notificationService = new NotificationService();
