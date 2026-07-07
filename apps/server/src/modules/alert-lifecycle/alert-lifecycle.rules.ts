import type { AppEvent, AppEventType } from '../events/index.js';
import type { AlertLifecycleSeverity, OpenAlertInput } from './alert-lifecycle.types.js';

const alertEventTypes = new Set<AppEventType>([
  'DEVICE_OFFLINE',
  'DEVICE_WARNING',
  'DEVICE_CRITICAL',
  'CPU_HIGH',
  'MEMORY_LOW',
  'DISK_LOW',
  'TEMPERATURE_HIGH',
]);

const healthRuleKeys = [
  'health.cpu_high',
  'health.memory_low',
  'health.disk_low',
  'health.temperature_high',
  'health.device_warning',
  'health.device_critical',
];

function normalizeSeverity(severity: AppEvent['severity']): AlertLifecycleSeverity {
  if (severity === 'critical') return 'critical';
  if (severity === 'warning') return 'warning';
  return 'info';
}

function ruleKeyForEventType(type: AppEventType): string {
  switch (type) {
    case 'DEVICE_OFFLINE':
      return 'device.offline';
    case 'CPU_HIGH':
      return 'health.cpu_high';
    case 'MEMORY_LOW':
      return 'health.memory_low';
    case 'DISK_LOW':
      return 'health.disk_low';
    case 'TEMPERATURE_HIGH':
      return 'health.temperature_high';
    case 'DEVICE_CRITICAL':
      return 'health.device_critical';
    case 'DEVICE_WARNING':
      return 'health.device_warning';
    default:
      return 'event.unknown';
  }
}

export function alertInputFromEvent(event: AppEvent): OpenAlertInput | null {
  if (!event.deviceId) return null;
  if (!alertEventTypes.has(event.type)) return null;

  return {
    deviceId: event.deviceId,
    ruleKey: ruleKeyForEventType(event.type),
    severity: normalizeSeverity(event.severity),
    title: event.title,
    message: event.message,
    source: event.source,
    metadata: {
      eventId: event.id,
      eventType: event.type,
      eventSeverity: event.severity,
      eventCreatedAt: event.createdAt,
      deviceName: event.deviceName,
      eventMetadata: event.metadata,
    },
  };
}

export function alertRuleKeysToResolve(event: AppEvent): string[] {
  if (!event.deviceId) return [];

  if (event.type !== 'DEVICE_ONLINE') {
    return [];
  }

  const keys = ['device.offline'];

  if (event.source === 'health-engine') {
    keys.push(...healthRuleKeys);
  }

  return keys;
}
