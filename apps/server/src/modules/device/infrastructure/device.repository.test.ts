import { describe, expect, it } from 'vitest';
import { normalizeConnectionStatus } from './device.repository.js';

describe('normalizeConnectionStatus', () => {
  it('keeps connectivity binary and treats legacy degraded as reachable', () => {
    expect(normalizeConnectionStatus('online')).toBe('online');
    expect(normalizeConnectionStatus('degraded')).toBe('online');
    expect(normalizeConnectionStatus('offline')).toBe('offline');
    expect(normalizeConnectionStatus('unknown')).toBe('offline');
  });
});
