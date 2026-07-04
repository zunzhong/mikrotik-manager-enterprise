import { apiGet, apiPost } from '../../lib/api';

export interface CompliancePolicy {
  key: string; title: string; description: string; severity: string; category: string;
}
export interface ComplianceResult {
  id: string; policyKey: string; severity: string; status: string; message: string; evidence?: unknown;
}
export interface ComplianceReport {
  id: string; deviceId: string; status: string; score: number; createdAt: string; results: ComplianceResult[];
}
export const complianceApi = {
  policies: () => apiGet<CompliancePolicy[]>('/api/v1/compliance/policies'),
  reports: (deviceId: string) => apiGet<ComplianceReport[]>(`/api/v1/devices/${deviceId}/compliance/reports`),
  scan: (deviceId: string) => apiPost<ComplianceReport>(`/api/v1/devices/${deviceId}/compliance/scan`, {}),
};
