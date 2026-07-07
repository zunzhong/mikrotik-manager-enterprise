export type AlertLifecycleStatus = 'open' | 'acknowledged' | 'resolved';

export type AlertLifecycleSeverity = 'info' | 'warning' | 'critical';

export interface AlertLifecycleDeviceRef {
  id: string;
  name: string;
  host: string;
  status: string;
}

export interface AlertLifecycleItem {
  id: string;
  deviceId?: string | null;
  ruleKey: string;
  severity: AlertLifecycleSeverity;
  status: AlertLifecycleStatus;
  title: string;
  message: string;
  source: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  device?: AlertLifecycleDeviceRef | null;
}

export interface AlertLifecycleSummary {
  status: {
    open: number;
    acknowledged: number;
    resolved: number;
  };
  activeSeverity: {
    critical: number;
    warning: number;
    info: number;
  };
  activeTotal: number;
  generatedAt: string;
}

export interface AlertLifecycleListQuery {
  deviceId?: string;
  ruleKey?: string;
  status?: AlertLifecycleStatus | AlertLifecycleStatus[];
  severity?: AlertLifecycleSeverity | AlertLifecycleSeverity[];
  limit?: number;
}

export interface AlertLifecycleActionInput {
  reason?: string;
}
