import { apiGet, apiPost } from '../../lib/api';
import type {
  NotificationChannel,
  NotificationDelivery,
  NotificationRule,
  NotificationSeedResult,
  NotificationTestResult,
} from './notification.types';

export const notificationApi = {
  channels: () => apiGet<NotificationChannel[]>('/api/v1/notifications/channels'),

  rules: () => apiGet<NotificationRule[]>('/api/v1/notifications/rules'),

  deliveries: (limit = 100) =>
    apiGet<NotificationDelivery[]>(`/api/v1/notifications/deliveries?limit=${limit}`),

  seedDefaults: () =>
    apiPost<NotificationSeedResult>('/api/v1/notifications/seed-defaults', {}),

  test: () =>
    apiPost<NotificationTestResult>('/api/v1/notifications/test', {
      eventType: 'ALERT_OPENED',
      severity: 'critical',
      title: 'Notification UI test',
      message: 'This test payload was queued from the Enterprise Dashboard.',
      source: 'notification-dashboard',
    }),
};
