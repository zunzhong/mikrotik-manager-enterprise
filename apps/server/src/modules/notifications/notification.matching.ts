import type {
  NotificationPayload,
  NotificationRule,
} from './notification.types.js';

export function notificationRuleMatches(
  rule: NotificationRule,
  payload: NotificationPayload,
): boolean {
  if (!rule.enabled) return false;

  const typeMatches =
    rule.eventTypes.includes('*') || rule.eventTypes.includes(payload.eventType);

  const severityMatches =
    rule.severities.includes(payload.severity);

  return typeMatches && severityMatches;
}
