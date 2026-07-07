import { apiGet, apiPost } from '../../lib/api';
import type {
  AlertLifecycleActionInput,
  AlertLifecycleItem,
  AlertLifecycleListQuery,
  AlertLifecycleSummary,
} from './alert-lifecycle.types';

function queryValue(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value.join(',') : value;
}

function queryString(query: AlertLifecycleListQuery = {}): string {
  const params = new URLSearchParams();

  if (query.deviceId) params.set('deviceId', query.deviceId);
  if (query.ruleKey) params.set('ruleKey', query.ruleKey);

  const status = queryValue(query.status);
  const severity = queryValue(query.severity);

  if (status) params.set('status', status);
  if (severity) params.set('severity', severity);
  if (query.limit) params.set('limit', String(query.limit));

  const value = params.toString();
  return value ? `?${value}` : '';
}

export const alertLifecycleApi = {
  summary: () => apiGet<AlertLifecycleSummary>('/api/v1/alert-lifecycle/summary'),

  list: (query: AlertLifecycleListQuery = {}) =>
    apiGet<AlertLifecycleItem[]>(`/api/v1/alert-lifecycle${queryString(query)}`),

  active: () => apiGet<AlertLifecycleItem[]>('/api/v1/alert-lifecycle/active'),

  get: (id: string) => apiGet<AlertLifecycleItem>(`/api/v1/alert-lifecycle/${id}`),

  acknowledge: (id: string, input: AlertLifecycleActionInput = {}) =>
    apiPost<AlertLifecycleItem>(`/api/v1/alert-lifecycle/${id}/acknowledge`, input),

  resolve: (id: string, input: AlertLifecycleActionInput = {}) =>
    apiPost<AlertLifecycleItem>(`/api/v1/alert-lifecycle/${id}/resolve`, input),
};
