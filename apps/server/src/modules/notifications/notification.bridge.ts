import { eventBus, type AppEvent } from '../events/index.js';
import { notificationService } from './notification.service.js';
import type { NotificationPayload, NotificationSeverity } from './notification.types.js';

let unsubscribeNotificationEventBridge: (() => void) | null = null;

function severityFromEvent(event: AppEvent): NotificationSeverity {
  if (event.severity === 'critical') return 'critical';
  if (event.severity === 'warning') return 'warning';
  if (event.severity === 'success') return 'success';
  return 'info';
}

function payloadFromEvent(event: AppEvent): NotificationPayload {
  return {
    eventId: event.id,
    eventType: event.type,
    severity: severityFromEvent(event),
    title: event.title,
    message: event.message,
    source: event.source,
    deviceId: event.deviceId,
    deviceName: event.deviceName,
    metadata: event.metadata,
    createdAt: event.createdAt,
  };
}

async function handleEvent(event: AppEvent): Promise<void> {
  const payload = payloadFromEvent(event);
  const deliveries = notificationService.enqueue(payload);

  if (deliveries.length === 0) {
    return;
  }

  await notificationService.processPending(deliveries.length);
}

export function registerNotificationEventBridge(): void {
  if (unsubscribeNotificationEventBridge) {
    return;
  }

  notificationService.seedDefaults();
  unsubscribeNotificationEventBridge = eventBus.subscribe(handleEvent);
}

export function unregisterNotificationEventBridge(): void {
  if (!unsubscribeNotificationEventBridge) {
    return;
  }

  unsubscribeNotificationEventBridge();
  unsubscribeNotificationEventBridge = null;
}
