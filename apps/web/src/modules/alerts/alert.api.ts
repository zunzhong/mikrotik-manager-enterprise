import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '../../lib/api';

export interface AlertRule {
  key: string;
  title: string;
  severity: string;
  source: string;
  description: string;
  enabledByDefault?: boolean;
  enabled?: boolean;
  configured?: boolean;
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
  device?: { id: string; name: string; host: string };
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
  deviceRules: (deviceId: string) =>
    apiGet<AlertRule[]>(`/api/v1/devices/${deviceId}/alerts/rules`),
  configureDeviceRule: (deviceId: string, ruleKey: string, enabled: boolean) =>
    apiPut(`/api/v1/devices/${deviceId}/alerts/rules/${encodeURIComponent(ruleKey)}`, { enabled }),
  removeDeviceRuleConfig: (deviceId: string, ruleKey: string) =>
    apiDelete(`/api/v1/devices/${deviceId}/alerts/rules/${encodeURIComponent(ruleKey)}`),
  list: () => apiGet<AlertRecord[]>('/api/v1/alerts'),
  acknowledge: (alertId: string) => apiPatch<AlertRecord>(`/api/v1/alerts/${alertId}/ack`, {}),
  resolve: (alertId: string) => apiPatch<AlertRecord>(`/api/v1/alerts/${alertId}/resolve`, {}),
  evaluateAll: () => apiPost<AlertEvaluationResult>('/api/v1/alerts/evaluate', {}),
  evaluateDevice: (deviceId: string) =>
    apiPost<AlertEvaluationResult>(`/api/v1/devices/${deviceId}/alerts/evaluate`, {}),
};
