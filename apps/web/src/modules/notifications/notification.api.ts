import { apiGet, apiPost } from '../../lib/api';
import type {
  CreateNotificationChannelInput,
  CreateNotificationRuleInput,
  NotificationChannel,
  NotificationDelivery,
  NotificationDeliveryWorkerResult,
  NotificationRule,
  NotificationSeedResult,
  NotificationSummary,
  NotificationTestResult,
} from './notification.types';

export const notificationApi = {
  summary: () => apiGet<NotificationSummary>('/api/v1/notifications/summary'),

  channels: () => apiGet<NotificationChannel[]>('/api/v1/notifications/channels'),

  createChannel: (input: CreateNotificationChannelInput) =>
    apiPost<NotificationChannel>('/api/v1/notifications/channels', input),

  rules: () => apiGet<NotificationRule[]>('/api/v1/notifications/rules'),

  createRule: (input: CreateNotificationRuleInput) =>
    apiPost<NotificationRule>('/api/v1/notifications/rules', input),

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

  processPending: () =>
    apiPost<NotificationDeliveryWorkerResult>('/api/v1/notifications/process-pending', {
      limit: 50,
    }),
};
