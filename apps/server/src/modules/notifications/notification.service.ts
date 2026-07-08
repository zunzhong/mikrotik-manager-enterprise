import { notificationRuleMatches } from './notification.matching.js';
import { notificationDeliveryWorker } from './notification.delivery.js';
import { notificationStore } from './notification.store.js';
import type {
  CreateNotificationChannelInput,
  CreateNotificationRuleInput,
  NotificationDelivery,
  NotificationPayload,
  NotificationRetryResult,
} from './notification.types.js';

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
    return notificationStore.createChannel(input);
  }

  public listChannels() {
    return notificationStore.listChannels();
  }

  public createRule(input: CreateNotificationRuleInput) {
    return notificationStore.createRule(input);
  }

  public listRules() {
    return notificationStore.listRules();
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

    return deliveries;
  }

  public async processPending(limit?: number) {
    return notificationDeliveryWorker.processPending(limit);
  }

  public async retryDelivery(deliveryId: string) {
    return notificationDeliveryWorker.processOne(deliveryId);
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

    return retryResult(retryable.length, reset, retryable.length - reset, workerResult);
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

    return {
      channels: [inApp],
      rules: [criticalRule],
    };
  }
}

export const notificationService = new NotificationService();
