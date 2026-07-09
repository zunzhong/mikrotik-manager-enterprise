import { apiGet, apiPost } from '../../lib/api';
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

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function apiJson<T>(path: string, method: 'PATCH' | 'DELETE', body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? `Notification request failed: ${response.status}`);
  }

  if (payload.data === undefined) {
    throw new Error('Notification API returned no data.');
  }

  return payload.data;
}

export const notificationApi = {
  summary: () => apiGet<NotificationSummary>('/api/v1/notifications/summary'),

  channels: () => apiGet<NotificationChannel[]>('/api/v1/notifications/channels'),

  createChannel: (input: CreateNotificationChannelInput) =>
    apiPost<NotificationChannel>('/api/v1/notifications/channels', input),

  updateChannel: (id: string, input: UpdateNotificationChannelInput) =>
    apiJson<NotificationChannel>(`/api/v1/notifications/channels/${id}`, 'PATCH', input),

  deleteChannel: (id: string) =>
    apiJson<NotificationDeleteResult>(`/api/v1/notifications/channels/${id}`, 'DELETE'),

  rules: () => apiGet<NotificationRule[]>('/api/v1/notifications/rules'),

  createRule: (input: CreateNotificationRuleInput) =>
    apiPost<NotificationRule>('/api/v1/notifications/rules', input),

  updateRule: (id: string, input: UpdateNotificationRuleInput) =>
    apiJson<NotificationRule>(`/api/v1/notifications/rules/${id}`, 'PATCH', input),

  deleteRule: (id: string) =>
    apiJson<NotificationDeleteResult>(`/api/v1/notifications/rules/${id}`, 'DELETE'),

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

  retryFailed: () =>
    apiPost<NotificationRetryResult>('/api/v1/notifications/retry-failed', {
      limit: 50,
    }),
};
