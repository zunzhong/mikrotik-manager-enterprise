import { eventBus, type AppEvent } from '../events/index.js';
import { notificationService } from './notification.service.js';
import type { NotificationPayload, NotificationSeverity } from './notification.types.js';

let unsubscribeNotificationEventBridge: (() => void) | null = null;

const deviceRuleManagedEvents = new Set([
  'DEVICE_ONLINE',
  'DEVICE_OFFLINE',
  'DEVICE_WARNING',
  'DEVICE_CRITICAL',
  'CPU_HIGH',
  'MEMORY_LOW',
  'DISK_LOW',
  'TEMPERATURE_HIGH',
  'INTERFACE_UP',
  'INTERFACE_DOWN',
  'ROUTEROS_LOG_ERROR',
  'ROUTEROS_LOG_WARNING',
  'ROUTEROS_LOGIN_FAILED',
]);

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
  // These events are routed only after the per-device alert rule has accepted them
  // and emitted ALERT_OPENED. This prevents disabled rules from leaking notifications.
  if (deviceRuleManagedEvents.has(event.type)) return;
  const payload = payloadFromEvent(event);
  const configuredIds = Array.isArray(event.metadata?.notificationChannelIds)
    ? event.metadata.notificationChannelIds.filter(
        (value): value is string => typeof value === 'string',
      )
    : [];
  const useDeviceRouting =
    event.type === 'ALERT_OPENED' && typeof event.metadata?.notifyAllChannels === 'boolean';
  const deliveries = useDeviceRouting
    ? notificationService.enqueueToChannels(
        payload,
        event.metadata?.notifyAllChannels === true ? undefined : configuredIds,
      )
    : notificationService.enqueue(payload);

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
