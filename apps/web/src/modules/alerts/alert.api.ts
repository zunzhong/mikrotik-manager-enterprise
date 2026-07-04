import { apiGet, apiPatch, apiPost } from '../../lib/api';

export interface AlertRule {
  key: string;
  title: string;
  severity: string;
  source: string;
  description: string;
  enabledByDefault?: boolean;
}

export interface AlertRecord {
  id: string;
  deviceId?: string;
  ruleKey: string;
  severity: string;
  status: string;
  title: string;
  message: string;
  source: string;
  metadata?: unknown;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

export interface AlertEvaluationResult {
  evaluatedRules: number;
  triggered: number;
  results: Array<{
    rule: AlertRule;
    triggered: boolean;
    deviceId?: string;
    title: string;
    message: string;
    metadata?: unknown;
  }>;
}

export const alertApi = {
  rules: () => apiGet<AlertRule[]>('/api/v1/alerts/rules'),
  list: () => apiGet<AlertRecord[]>('/api/v1/alerts'),
  acknowledge: (alertId: string) => apiPatch<AlertRecord>(`/api/v1/alerts/${alertId}/ack`, {}),
  evaluateAll: () => apiPost<AlertEvaluationResult>('/api/v1/alerts/evaluate', {}),
  evaluateDevice: (deviceId: string) =>
    apiPost<AlertEvaluationResult>(`/api/v1/devices/${deviceId}/alerts/evaluate`, {}),
};
