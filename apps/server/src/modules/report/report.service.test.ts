import { afterEach, describe, expect, it, vi } from 'vitest';
import { deviceRepository } from '../device/infrastructure/device.repository.js';
import { buildPeriodicReport, ReportService } from './report.service.js';
import { reportStore } from './report.store.js';

const scheduleIds: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  for (const id of scheduleIds.splice(0)) reportStore.deleteSchedule(id);
});

describe('buildPeriodicReport', () => {
  it('puts RouterOS identity first and omits excluded report sections', () => {
    const report = buildPeriodicReport({
      identity: 'CORE-RTR-01',
      score: 96,
      cpu: 18,
      ram: 32.5,
      temperature: 46,
      intervalMinutes: 60,
      interfaceTotals: [
        { name: 'ether1', txBytes: 2 * 1024 ** 3, rxBytes: 8 * 1024 ** 3 },
        { name: 'sfp1', txBytes: 512 * 1024 ** 2, rxBytes: 2 * 1024 ** 3 },
      ],
      accumulatedBytes: 5 * 1024 ** 4,
      language: 'vi',
      timeZone: 'Asia/Ho_Chi_Minh',
      createdAt: new Date('2026-07-18T03:00:00.000Z'),
    });

    expect(report.split('\n')[0]).toBe('🏷️ Identity: CORE-RTR-01');
    expect(report).toContain('🏆 ĐIỂM HIỆU SUẤT: 96 / 100');
    expect(report).toContain('🌡️ Sức khỏe: CPU: 18% | RAM: 32.5% | Temp: 46°C');
    expect(report).toContain('📈 Lưu lượng tiêu thụ trong 1h (TX/RX):');
    expect(report).toContain('\n   🟢 ether1: 2.00 GB / 8.00 GB');
    expect(report).toContain('\n   🔵 sfp1: 512.0 MB / 2.00 GB');
    expect(report).not.toContain('ether1: TX');
    expect(report).not.toContain('ether1: RX');
    expect(report).toContain('💰 Tổng data tích lũy: 5.00 TB');
    expect(report).not.toContain('Tình trạng WAN');
    expect(report).not.toContain('Trùng lặp IP');
    expect(report).not.toContain('Excel');
    expect(report).not.toContain('Chi tiết');
  });
});

describe('ReportService.sendScheduleNow', () => {
  it('sends from a saved schedule without changing its next scheduled run', async () => {
    vi.spyOn(deviceRepository, 'findMany').mockResolvedValue([]);
    const schedule = reportStore.saveSchedule({
      name: 'Manual send keeps schedule',
      enabled: true,
      allDevices: true,
      deviceIds: [],
      startAt: new Date(Date.now() + 3_600_000).toISOString(),
      intervalMinutes: 60,
      channelMode: 'existing',
      channelId: 'telegram-1',
    });
    scheduleIds.push(schedule.id);
    const before = reportStore.getSchedule(schedule.id);

    const results = await new ReportService().sendScheduleNow(schedule.id);
    const after = reportStore.getSchedule(schedule.id);

    expect(results).toEqual([]);
    expect(after?.nextRunAt).toBe(before?.nextRunAt);
    expect(after?.lastRunAt).toBe(before?.lastRunAt);
  });
});
