import { describe, expect, it } from 'vitest';
import { nextReportRun } from './report.store.js';

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
});
