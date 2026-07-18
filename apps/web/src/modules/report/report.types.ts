import type { NotificationChannel } from '../notifications/notification.types';

export type ReportChannelMode = 'existing' | 'dedicated';

export interface ReportSchedule {
  id: string;
  name: string;
  enabled: boolean;
  allDevices: boolean;
  deviceIds: string[];
  startAt: string;
  intervalMinutes: number;
  channelMode: ReportChannelMode;
  channelId: string;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  nextRunAt?: string;
}

export interface ReportHistoryItem {
  id: string;
  scheduleId: string;
  scheduleName: string;
  deviceId: string;
  deviceName: string;
  identity: string;
  status: 'sent' | 'failed';
  createdAt: string;
  error?: string;
}

export interface ReportDevice {
  id: string;
  name: string;
  host: string;
  status: string;
}

export interface ReportOverview {
  schedules: ReportSchedule[];
  history: ReportHistoryItem[];
  telegramChannels: NotificationChannel[];
  devices: ReportDevice[];
}

export interface SaveReportScheduleInput {
  name: string;
  enabled: boolean;
  allDevices: boolean;
  deviceIds: string[];
  startAt: string;
  intervalMinutes: number;
  channelMode: ReportChannelMode;
  channelId?: string;
  telegram?: { botToken?: string; chatId?: string };
}
