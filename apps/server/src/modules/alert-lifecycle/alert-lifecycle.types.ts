import type { AppEventSeverity } from '../events/index.js';

export type AlertLifecycleStatus = 'open' | 'acknowledged' | 'resolved';

export type AlertLifecycleSeverity = Exclude<AppEventSeverity, 'success'>;

export interface OpenAlertInput {
  deviceId?: string;
  ruleKey: string;
  severity: AlertLifecycleSeverity;
  title: string;
  message: string;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface AlertResolutionInput {
  reason: string;
  metadata?: Record<string, unknown>;
}
