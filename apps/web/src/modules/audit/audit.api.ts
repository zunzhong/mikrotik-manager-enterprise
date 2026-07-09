import { apiGet, apiPost } from '../../lib/api';
import type {
  AuditEvent,
  AuditPageResult,
  AuditQueryInput,
  AuditRetentionInput,
  AuditRetentionResult,
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

function exportQueryToSearchParams(
  format: 'json' | 'csv',
  query: AuditQueryInput = {},
): string {
  return queryToSearchParams({
    ...query,
    limit: query.limit ?? 1000,
    format,
  } as AuditQueryInput & { format: 'json' | 'csv' });
}

export const auditApi = {
  summary: (query?: AuditQueryInput) =>
    apiGet<AuditSummary>(`/api/v1/audit/summary${queryToSearchParams(query)}`),

  list: (query?: AuditQueryInput) =>
    apiGet<AuditEvent[]>(`/api/v1/audit${queryToSearchParams(query)}`),

  page: (query?: AuditQueryInput) =>
    apiGet<AuditPageResult>(`/api/v1/audit/page${queryToSearchParams(query)}`),

  get: (id: string) =>
    apiGet<AuditEvent>(`/api/v1/audit/${id}`),

  create: (input: CreateAuditEventInput) =>
    apiPost<AuditEvent>('/api/v1/audit', input),

  seedDemo: () =>
    apiPost<AuditSeedDemoResult>('/api/v1/audit/seed-demo', {}),

  pruneRetention: (input: AuditRetentionInput) =>
    apiPost<AuditRetentionResult>('/api/v1/audit/retention/prune', input),

  exportUrl: (format: 'json' | 'csv', query?: AuditQueryInput) =>
    `/api/v1/audit/export${exportQueryToSearchParams(format, query)}`,
};
