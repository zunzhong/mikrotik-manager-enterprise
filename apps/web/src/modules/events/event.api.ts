import { apiGet, apiPost } from '../../lib/api';
import type { AppEvent, EventQuery } from './event.types';

function queryString(query: EventQuery = {}): string {
  const params = new URLSearchParams();

  if (query.deviceId) params.set('deviceId', query.deviceId);
  if (query.severity) params.set('severity', query.severity);
  if (query.type) params.set('type', query.type);
  if (query.limit) params.set('limit', String(query.limit));

  const value = params.toString();
  return value ? `?${value}` : '';
}

export const eventApi = {
  list: (query: EventQuery = {}) => apiGet<AppEvent[]>(`/api/v1/events${queryString(query)}`),

  recent: () => apiGet<AppEvent[]>('/api/v1/events/recent'),

  publishTest: (message: string) =>
    apiPost<AppEvent>('/api/v1/events/test', {
      message,
    }),
};
