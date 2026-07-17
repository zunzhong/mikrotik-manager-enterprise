import { describe, expect, it } from 'vitest';
import { nextScheduledRun } from './backup-schedule.js';

describe('backup schedule', () => {
  it('uses the selected time when it is still ahead today', () => {
    const from = new Date(2026, 6, 17, 1, 15, 0);
    expect(nextScheduledRun('02:30', 24, from)).toEqual(new Date(2026, 6, 17, 2, 30, 0));
  });

  it('keeps the selected clock time for daily schedules', () => {
    const from = new Date(2026, 6, 17, 3, 0, 0);
    expect(nextScheduledRun('02:30', 24, from)).toEqual(new Date(2026, 6, 18, 2, 30, 0));
  });

  it('advances missed intervals without scheduling in the past', () => {
    const from = new Date(2026, 6, 17, 10, 45, 0);
    expect(nextScheduledRun('08:00', 2, from)).toEqual(new Date(2026, 6, 17, 12, 0, 0));
  });
});
