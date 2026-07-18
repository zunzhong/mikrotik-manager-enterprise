import { describe, expect, it } from 'vitest';
import { nextReportRun, ReportStore } from './report.store.js';

describe('nextReportRun', () => {
  it('keeps a future start time', () => {
    expect(
      nextReportRun('2026-07-18T04:00:00.000Z', 60, new Date('2026-07-18T03:00:00.000Z')),
    ).toBe('2026-07-18T04:00:00.000Z');
  });

  it('moves a past start time to the next interval', () => {
    expect(
      nextReportRun('2026-07-18T01:00:00.000Z', 30, new Date('2026-07-18T02:10:00.000Z')),
    ).toBe('2026-07-18T02:30:00.000Z');
  });

  it('returns only enabled schedules whose configured run time is due', () => {
    const store = new ReportStore();
    const now = new Date();
    const common = {
      name: 'Scheduled Telegram report',
      allDevices: true,
      deviceIds: [],
      intervalMinutes: 60,
      channelMode: 'existing' as const,
      channelId: 'telegram-1',
    };
    const due = store.saveSchedule({
      ...common,
      enabled: true,
      startAt: new Date(now.getTime() - 5_000).toISOString(),
    });
    store.saveSchedule({
      ...common,
      name: 'Disabled report',
      enabled: false,
      startAt: new Date(now.getTime() - 5_000).toISOString(),
    });
    store.saveSchedule({
      ...common,
      name: 'Future report',
      enabled: true,
      startAt: new Date(now.getTime() + 3_600_000).toISOString(),
    });

    expect(store.due(now).map((schedule) => schedule.id)).toEqual([due.id]);
  });
});
