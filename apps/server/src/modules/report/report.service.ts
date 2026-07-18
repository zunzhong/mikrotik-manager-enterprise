import { prisma } from '../../database/index.js';
import { HttpError } from '../../errors/http-error.js';
import { deviceRealtimeService } from '../device/application/device-realtime.service.js';
import { deviceRepository } from '../device/infrastructure/device.repository.js';
import { notificationService } from '../notifications/notification.service.js';
import { systemPreferencesService } from '../system/application/system-preferences.service.js';
import { reportStore } from './report.store.js';
import type { ReportSchedule, SaveReportScheduleInput } from './report.types.js';

const REPORT_EVENT_TYPE = 'PERIODIC_REPORT';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function textValue(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function formatBytes(value: number): string {
  if (value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index >= 3 ? 2 : 1)} ${units[index]}`;
}

function healthLabel(score: number): { icon: string; vi: string; en: string } {
  if (score >= 90) return { icon: '🟢', vi: 'XUẤT SẮC', en: 'EXCELLENT' };
  if (score >= 60) return { icon: '🟡', vi: 'CẢNH BÁO', en: 'WARNING' };
  return { icon: '🔴', vi: 'NGUY HIỂM', en: 'CRITICAL' };
}

function temperatureFromHealth(health: object[] | undefined): number | undefined {
  for (const row of health ?? []) {
    for (const [key, value] of Object.entries(record(row))) {
      if (
        key.toLowerCase().includes('temp') ||
        textValue(record(row).name).toLowerCase().includes('temp')
      ) {
        const parsed = numberValue(key === 'name' ? record(row).value : value);
        if (parsed !== undefined) return parsed;
      }
    }
  }
  return undefined;
}

export function buildPeriodicReport(input: {
  identity: string;
  score: number;
  cpu?: number;
  ram?: number;
  temperature?: number;
  intervalMinutes: number;
  interfaceTotals: Array<{ name: string; bytes: number }>;
  accumulatedBytes: number;
  language: 'vi' | 'en';
  timeZone: string;
  createdAt?: Date;
}): string {
  const createdAt = input.createdAt ?? new Date();
  const marker = new Intl.DateTimeFormat(input.language === 'en' ? 'en-US' : 'vi-VN', {
    timeZone: input.timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(createdAt);
  const status = healthLabel(input.score);
  const period =
    input.intervalMinutes % 60 === 0
      ? `${input.intervalMinutes / 60}h`
      : `${input.intervalMinutes} ${input.language === 'en' ? 'minutes' : 'phút'}`;
  const interfaceIcons = ['🟢', '🔵', '🟡', '🟣', '🟠', '⚪'];
  const traffic = input.interfaceTotals.length
    ? input.interfaceTotals
        .map(
          (item, index) =>
            `${interfaceIcons[index % interfaceIcons.length]} ${item.name}: ${formatBytes(item.bytes)}`,
        )
        .join('\n')
    : input.language === 'en'
      ? '⚪ No traffic data in this period'
      : '⚪ Chưa có dữ liệu lưu lượng trong chu kỳ này';
  const cpu = input.cpu === undefined ? '—' : `${input.cpu.toFixed(0)}%`;
  const ram = input.ram === undefined ? '—' : `${input.ram.toFixed(1)}%`;
  const temperature = input.temperature === undefined ? '—' : `${input.temperature.toFixed(0)}°C`;

  if (input.language === 'en') {
    return [
      `🏷️ Identity: ${input.identity}`,
      `📊 PERIODIC ROUTER REPORT (${marker})`,
      '================================',
      `🏆 PERFORMANCE SCORE: ${input.score} / 100 (${status.icon} ${status.en})`,
      `🌡️ Health: CPU: ${cpu} | RAM: ${ram} | Temp: ${temperature}`,
      '',
      `📈 Traffic consumed in ${period}:`,
      traffic,
      '================================',
      `💰 Accumulated data: ${formatBytes(input.accumulatedBytes)}`,
    ].join('\n');
  }
  return [
    `🏷️ Identity: ${input.identity}`,
    `📊 BÁO CÁO ROUTER ĐỊNH KỲ (MỐC ${marker})`,
    '================================',
    `🏆 ĐIỂM HIỆU SUẤT: ${input.score} / 100 (${status.icon} ${status.vi})`,
    `🌡️ Sức khỏe: CPU: ${cpu} | RAM: ${ram} | Temp: ${temperature}`,
    '',
    `📈 Lưu lượng tiêu thụ trong ${period}:`,
    traffic,
    '================================',
    `💰 Tổng data tích lũy: ${formatBytes(input.accumulatedBytes)}`,
  ].join('\n');
}

export class ReportService {
  public async overview() {
    return {
      schedules: reportStore.listSchedules(),
      history: reportStore.listHistory(),
      telegramChannels: notificationService
        .listChannels()
        .filter((channel) => channel.type === 'telegram'),
      devices: (await deviceRepository.findMany()).map((device) => ({
        id: device.id,
        name: device.name,
        host: device.host,
        status: device.status,
      })),
    };
  }

  public saveSchedule(input: SaveReportScheduleInput, id?: string): ReportSchedule {
    const current = id ? reportStore.getSchedule(id) : undefined;
    if (id && !current)
      throw new HttpError(404, 'REPORT_SCHEDULE_NOT_FOUND', 'Report schedule not found');
    let channelId = input.channelId ?? current?.channelId ?? '';

    if (input.channelMode === 'existing') {
      const channel = notificationService.listChannels().find((item) => item.id === channelId);
      if (!channel || channel.type !== 'telegram') {
        throw new HttpError(
          400,
          'REPORT_TELEGRAM_CHANNEL_REQUIRED',
          'Hãy chọn một kênh Telegram hợp lệ.',
        );
      }
    } else {
      const dedicatedCurrent = current?.channelMode === 'dedicated' ? current.channelId : undefined;
      const botToken = input.telegram?.botToken?.trim() ?? '';
      const chatId = input.telegram?.chatId?.trim() ?? '';
      if (!dedicatedCurrent && (!botToken || !chatId)) {
        throw new HttpError(
          400,
          'REPORT_TELEGRAM_CONFIG_REQUIRED',
          'Hãy nhập Bot Token và Chat ID dành riêng cho báo cáo.',
        );
      }
      const config = {
        ...(botToken ? { botToken } : {}),
        ...(chatId ? { chatId } : {}),
        timeoutMs: 15_000,
      };
      const channel = dedicatedCurrent
        ? notificationService.updateChannel(dedicatedCurrent, {
            name: `Report Telegram — ${input.name}`,
            enabled: true,
            config,
          })
        : notificationService.createChannel({
            name: `Report Telegram — ${input.name}`,
            type: 'telegram',
            enabled: true,
            config,
          });
      if (!channel)
        throw new HttpError(
          404,
          'REPORT_TELEGRAM_CHANNEL_NOT_FOUND',
          'Report Telegram channel not found',
        );
      channelId = channel.id;
    }

    const deviceIds = [...new Set(input.deviceIds ?? [])];
    if (!(input.allDevices ?? true) && deviceIds.length === 0) {
      throw new HttpError(400, 'REPORT_DEVICE_REQUIRED', 'Hãy chọn ít nhất một thiết bị.');
    }

    return reportStore.saveSchedule(
      {
        name: input.name.trim(),
        enabled: input.enabled ?? true,
        allDevices: input.allDevices ?? true,
        deviceIds,
        startAt: new Date(input.startAt).toISOString(),
        intervalMinutes: input.intervalMinutes,
        channelMode: input.channelMode,
        channelId,
      },
      id,
    );
  }

  public deleteSchedule(id: string) {
    return { id, deleted: reportStore.deleteSchedule(id) };
  }

  public async sendSchedule(id: string) {
    const schedule = reportStore.getSchedule(id);
    if (!schedule)
      throw new HttpError(404, 'REPORT_SCHEDULE_NOT_FOUND', 'Report schedule not found');
    const allDevices = await deviceRepository.findMany();
    const devices = schedule.allDevices
      ? allDevices
      : allDevices.filter((device) => schedule.deviceIds.includes(device.id));
    const results = [];

    for (const device of devices) {
      let identity = device.name;
      try {
        const snapshot =
          deviceRealtimeService.peek(device.id) ??
          (await deviceRealtimeService.getSnapshot(device.id));
        identity = textValue(record(snapshot.identity).name) || device.name;
        const resource = record(snapshot.resource);
        const cpu = numberValue(resource.cpuLoad ?? resource['cpu-load']);
        const totalMemory = numberValue(resource.totalMemory ?? resource['total-memory']);
        const freeMemory = numberValue(resource.freeMemory ?? resource['free-memory']);
        const ram =
          totalMemory && freeMemory !== undefined
            ? ((totalMemory - freeMemory) / totalMemory) * 100
            : undefined;
        const from = new Date(Date.now() - schedule.intervalMinutes * 60_000);
        const recentSamples = await prisma.trafficSample.findMany({
          where: { deviceId: device.id, collectedAt: { gte: from } },
          select: { interfaceName: true, rxDeltaBytes: true, txDeltaBytes: true },
        });
        const interfaceMap = new Map<string, number>();
        for (const sample of recentSamples) {
          const bytes = Number(sample.rxDeltaBytes) + Number(sample.txDeltaBytes);
          interfaceMap.set(
            sample.interfaceName,
            (interfaceMap.get(sample.interfaceName) ?? 0) + bytes,
          );
        }
        const accumulated = await prisma.trafficSample.aggregate({
          where: { deviceId: device.id },
          _sum: { rxDeltaBytes: true, txDeltaBytes: true },
        });
        const preferences = systemPreferencesService.get();
        const message = buildPeriodicReport({
          identity,
          score: snapshot.healthReport?.score ?? 0,
          cpu,
          ram,
          temperature: temperatureFromHealth(snapshot.health),
          intervalMinutes: schedule.intervalMinutes,
          interfaceTotals: [...interfaceMap.entries()]
            .map(([name, bytes]) => ({ name, bytes }))
            .filter((item) => item.bytes > 0)
            .sort((a, b) => b.bytes - a.bytes)
            .slice(0, 12),
          accumulatedBytes:
            Number(accumulated._sum.rxDeltaBytes ?? 0) + Number(accumulated._sum.txDeltaBytes ?? 0),
          language: preferences.language,
          timeZone: preferences.timeZone,
        });
        const delivery = notificationService.enqueueToChannels(
          {
            eventType: REPORT_EVENT_TYPE,
            severity: 'info',
            title: `Report · ${identity}`,
            message,
            source: 'periodic-report',
            deviceId: device.id,
            deviceName: device.name,
            metadata: { scheduleId: schedule.id },
            createdAt: new Date().toISOString(),
          },
          [schedule.channelId],
        )[0];
        if (!delivery) throw new Error('Kênh Telegram đang tắt hoặc không tồn tại.');
        const deliveryResult = await notificationService.retryDelivery(delivery.id);
        const sent = deliveryResult.sent > 0;
        const error = deliveryResult.deliveries[0]?.error;
        results.push(
          reportStore.addHistory({
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            deviceId: device.id,
            deviceName: device.name,
            identity,
            status: sent ? 'sent' : 'failed',
            error: sent ? undefined : (error ?? 'Telegram delivery failed'),
          }),
        );
      } catch (error) {
        results.push(
          reportStore.addHistory({
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            deviceId: device.id,
            deviceName: device.name,
            identity,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Report delivery failed',
          }),
        );
      }
    }
    reportStore.markRun(schedule.id);
    return results;
  }

  public async runDue() {
    const schedules = reportStore.due();
    const results = await Promise.allSettled(
      schedules.map((schedule) => this.sendSchedule(schedule.id)),
    );
    return { schedules: schedules.length, results };
  }
}

export const reportService = new ReportService();
