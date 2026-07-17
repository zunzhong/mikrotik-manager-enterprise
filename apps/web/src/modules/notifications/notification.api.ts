import { apiDelete, apiGet, apiPatch, apiPost } from '../../lib/api';
import type {
  CreateNotificationChannelInput,
  CreateNotificationRuleInput,
  NotificationChannel,
  NotificationDeleteResult,
  NotificationDelivery,
  NotificationDeliveryWorkerResult,
  NotificationRetryResult,
  NotificationRule,
  NotificationSeedResult,
  NotificationSummary,
  NotificationTestResult,
  UpdateNotificationChannelInput,
  UpdateNotificationRuleInput,
} from './notification.types';

export const notificationApi = {
  summary: () => apiGet<NotificationSummary>('/api/v1/notifications/summary'),

  channels: () => apiGet<NotificationChannel[]>('/api/v1/notifications/channels'),

  createChannel: (input: CreateNotificationChannelInput) =>
    apiPost<NotificationChannel>('/api/v1/notifications/channels', input),

  updateChannel: (id: string, input: UpdateNotificationChannelInput) =>
    apiPatch<NotificationChannel>(`/api/v1/notifications/channels/${id}`, input),

  deleteChannel: (id: string) =>
    apiDelete<NotificationDeleteResult>(`/api/v1/notifications/channels/${id}`),

  rules: () => apiGet<NotificationRule[]>('/api/v1/notifications/rules'),

  createRule: (input: CreateNotificationRuleInput) =>
    apiPost<NotificationRule>('/api/v1/notifications/rules', input),

  updateRule: (id: string, input: UpdateNotificationRuleInput) =>
    apiPatch<NotificationRule>(`/api/v1/notifications/rules/${id}`, input),

  deleteRule: (id: string) =>
    apiDelete<NotificationDeleteResult>(`/api/v1/notifications/rules/${id}`),

  deliveries: (limit = 100) =>
    apiGet<NotificationDelivery[]>(`/api/v1/notifications/deliveries?limit=${limit}`),

  seedDefaults: () => apiPost<NotificationSeedResult>('/api/v1/notifications/seed-defaults', {}),

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

  retryDelivery: (id: string) =>
    apiPost<NotificationDeliveryWorkerResult>(`/api/v1/notifications/deliveries/${id}/retry`, {}),

  testChannel: (id: string, deviceId?: string) =>
    apiPost<NotificationDeliveryWorkerResult>(`/api/v1/notifications/channels/${id}/test`, {
      deviceId,
    }),

  testAllChannels: () =>
    apiPost<NotificationDeliveryWorkerResult>('/api/v1/notifications/channels/test-all', {}),

  retryFailed: () =>
    apiPost<NotificationRetryResult>('/api/v1/notifications/retry-failed', {
      limit: 50,
    }),
};
