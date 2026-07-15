export type NotificationChannelType = 'email' | 'webhook' | 'slack' | 'telegram' | 'in_app';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'critical';

export type NotificationDeliveryStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export interface NotificationChannel {
  id: string;
  name: string;
  type: NotificationChannelType;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  config: Record<string, unknown>;
  status?: {
    configured: boolean;
    missingFields: string[];
    destination: string;
    lastDeliveryStatus?: NotificationDeliveryStatus;
    lastAttemptAt?: string;
    lastError?: string;
  };
}

export interface NotificationRule {
  id: string;
  name: string;
  enabled: boolean;
  eventTypes: string[];
  severities: NotificationSeverity[];
  channelIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPayload {
  eventId?: string;
  eventType: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  source: string;
  deviceId?: string;
  deviceName?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationDelivery {
  id: string;
  ruleId: string;
  channelId: string;
  channelType: NotificationChannelType;
  status: NotificationDeliveryStatus;
  payload: NotificationPayload;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  failedAt?: string;
  skippedAt?: string;
  error?: string;
}

export interface NotificationSeedResult {
  channels: NotificationChannel[];
  rules: NotificationRule[];
}

export interface NotificationTestResult {
  queued: number;
  deliveries: NotificationDelivery[];
}

export interface CreateNotificationChannelInput {
  name: string;
  type: NotificationChannelType;
  enabled?: boolean;
  config?: Record<string, unknown>;
}

export interface UpdateNotificationChannelInput {
  name?: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
}

export interface CreateNotificationRuleInput {
  name: string;
  enabled?: boolean;
  eventTypes: string[];
  severities: NotificationSeverity[];
  channelIds: string[];
}

export interface UpdateNotificationRuleInput {
  name?: string;
  enabled?: boolean;
  eventTypes?: string[];
  severities?: NotificationSeverity[];
  channelIds?: string[];
}

export interface NotificationDeleteResult {
  deleted: boolean;
  id: string;
}

export interface NotificationDeliveryWorkerResult {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  deliveries: NotificationDelivery[];
}

export interface NotificationRetryResult extends NotificationDeliveryWorkerResult {
  requested: number;
  reset: number;
  missing: number;
}

export interface NotificationSummary {
  channels: number;
  rules: number;
  deliveries: {
    pending: number;
    sent: number;
    failed: number;
    skipped: number;
  };
  generatedAt: string;
}
