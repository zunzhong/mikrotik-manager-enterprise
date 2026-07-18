import { apiDelete, apiGet, apiPost, apiPut } from '../../lib/api';
import type {
  ReportHistoryItem,
  ReportOverview,
  ReportSchedule,
  SaveReportScheduleInput,
} from './report.types';

export const reportApi = {
  overview: () => apiGet<ReportOverview>('/api/v1/reports'),
  create: (input: SaveReportScheduleInput) =>
    apiPost<ReportSchedule>('/api/v1/reports/schedules', input),
  update: (id: string, input: SaveReportScheduleInput) =>
    apiPut<ReportSchedule>(`/api/v1/reports/schedules/${id}`, input),
  delete: (id: string) =>
    apiDelete<{ id: string; deleted: boolean }>(`/api/v1/reports/schedules/${id}`),
  send: (id: string) => apiPost<ReportHistoryItem[]>(`/api/v1/reports/schedules/${id}/send`, {}),
};
