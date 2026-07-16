import { eventBus, type AppEvent } from '../events/index.js';
import { alertRuleKeysToResolve, alertInputFromEvent } from './alert-lifecycle.rules.js';
import { alertLifecycleService } from './alert-lifecycle.service.js';
import { prisma } from '../../database/index.js';
import { alertRules } from '../alerts/domain/alert-rules.js';

let unsubscribeAlertLifecycleBridge: (() => void) | null = null;

async function handleEvent(event: AppEvent): Promise<void> {
  if (event.deviceId) {
    const ruleKeys = alertRuleKeysToResolve(event);

    if (ruleKeys.length > 0) {
      await alertLifecycleService.resolveForDevice(event.deviceId, ruleKeys, {
        reason: `Resolved by ${event.type}`,
        metadata: {
          eventId: event.id,
          eventType: event.type,
          eventCreatedAt: event.createdAt,
          source: event.source,
        },
      });
    }
  }

  const alertInput = alertInputFromEvent(event);

  if (alertInput) {
    const deviceId = alertInput.deviceId;
    if (!deviceId) return;
    const config = await prisma.deviceAlertRuleConfig.findUnique({
      where: {
        deviceId_ruleKey: { deviceId, ruleKey: alertInput.ruleKey },
      },
    });
    const definition = alertRules.find((rule) => rule.key === alertInput.ruleKey);
    if (!(config?.enabled ?? definition?.enabledByDefault ?? false)) return;

    alertInput.metadata = {
      ...(alertInput.metadata ?? {}),
      notificationChannelIds: Array.isArray(config?.channelIds) ? config.channelIds : [],
      notifyAllChannels: config?.notifyAllChannels ?? true,
    };
    await alertLifecycleService.openOrUpdate(alertInput);
  }
}

export function registerAlertLifecycleBridge(): void {
  if (unsubscribeAlertLifecycleBridge) {
    return;
  }

  unsubscribeAlertLifecycleBridge = eventBus.subscribe(handleEvent);
}

export function unregisterAlertLifecycleBridge(): void {
  if (!unsubscribeAlertLifecycleBridge) {
    return;
  }

  unsubscribeAlertLifecycleBridge();
  unsubscribeAlertLifecycleBridge = null;
}
