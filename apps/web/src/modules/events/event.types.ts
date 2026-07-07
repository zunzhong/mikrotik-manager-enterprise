export type AppEventSeverity = 'info' | 'success' | 'warning' | 'critical';

export type AppEventType =
  | 'SYSTEM_EVENT'
  | 'DEVICE_ONLINE'
  | 'DEVICE_OFFLINE'
  | 'DEVICE_WARNING'
  | 'DEVICE_CRITICAL'
  | 'RESOURCE_UPDATED'
  | 'CPU_HIGH'
  | 'MEMORY_LOW'
  | 'DISK_LOW'
  | 'TEMPERATURE_HIGH'
  | 'BACKUP_COMPLETED'
  | 'BACKUP_FAILED'
  | 'USER_ACTION'
  | 'AUDIT_EVENT'
  | 'ALERT_OPENED'
  | 'ALERT_ACKNOWLEDGED'
  | 'ALERT_RESOLVED';

export interface AppEvent {
  id: string;
  type: AppEventType;
  severity: AppEventSeverity;
  title: string;
  message: string;
  createdAt: string;
  source: string;
  deviceId?: string;
  deviceName?: string;
  metadata?: Record<string, unknown>;
}

export interface PublishEventInput {
  type: AppEventType;
  severity?: AppEventSeverity;
  title: string;
  message: string;
  source?: string;
  deviceId?: string;
  deviceName?: string;
  metadata?: Record<string, unknown>;
}

export interface EventQuery {
  deviceId?: string;
  severity?: AppEventSeverity;
  type?: AppEventType;
  limit?: number;
}
