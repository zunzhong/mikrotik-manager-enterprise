import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import { bucketIdentity, periodBounds } from './device-traffic-monitor.service.js';

describe('device traffic monitor timezone buckets', () => {
  it('converts a Ho Chi Minh local day to the correct UTC query range', () => {
    const { from, to } = periodBounds('hour', 'Asia/Ho_Chi_Minh', '2026-07-15');

    expect(from.toUTC().toISO()).toBe('2026-07-14T17:00:00.000Z');
    expect(to.toUTC().toISO()).toBe('2026-07-15T17:00:00.000Z');
  });

  it('labels UTC samples using the configured timezone', () => {
    const local = DateTime.fromISO('2026-07-15T05:00:00.000Z', { zone: 'utc' }).setZone(
      'Asia/Ho_Chi_Minh',
    );

    expect(bucketIdentity(local, 'hour').label).toBe('12:00');
  });

  it('keeps timezone-aware day boundaries across daylight-saving transitions', () => {
    const { from, to } = periodBounds('hour', 'America/New_York', '2026-03-08');

    expect(to.toMillis() - from.toMillis()).toBe(23 * 60 * 60 * 1000);
  });
});
