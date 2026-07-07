import { notificationStore } from './notification.store.js';
import type {
  NotificationDelivery,
  NotificationDeliveryWorkerResult,
} from './notification.types.js';

function unsupportedChannelReason(delivery: NotificationDelivery): string {
  return `Delivery channel '${delivery.channelType}' is not implemented yet.`;
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

    if (delivery.channelType === 'in_app') {
      return notificationStore.markSent(delivery.id);
    }

    return notificationStore.markSkipped(delivery.id, unsupportedChannelReason(delivery));
  }
}

export const notificationDeliveryWorker = new NotificationDeliveryWorker();
