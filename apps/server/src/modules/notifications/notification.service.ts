import { notificationRuleMatches } from './notification.matching.js';
import { notificationDeliveryWorker } from './notification.delivery.js';
import { notificationStore } from './notification.store.js';
import type {
  CreateNotificationChannelInput,
  CreateNotificationRuleInput,
  NotificationDelivery,
  NotificationPayload,
} from './notification.types.js';

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
