import { apiGet, apiPost } from '../../lib/api';
import type {
  AuditEvent,
  AuditQueryInput,
  AuditSeedDemoResult,
  AuditSummary,
  CreateAuditEventInput,
} from './audit.types';

function queryToSearchParams(query: AuditQueryInput = {}): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && `${value}`.length > 0) {
      params.set(key, `${value}`);
    }
  }

  const queryString = params.toString();

  return queryString ? `?${queryString}` : '';
}

export const auditApi = {
  summary: (query?: AuditQueryInput) =>
    apiGet<AuditSummary>(`/api/v1/audit/summary${queryToSearchParams(query)}`),

  list: (query?: AuditQueryInput) =>
    apiGet<AuditEvent[]>(`/api/v1/audit${queryToSearchParams(query)}`),

  get: (id: string) =>
    apiGet<AuditEvent>(`/api/v1/audit/${id}`),

  create: (input: CreateAuditEventInput) =>
    apiPost<AuditEvent>('/api/v1/audit', input),

  seedDemo: () =>
    apiPost<AuditSeedDemoResult>('/api/v1/audit/seed-demo', {}),
};
