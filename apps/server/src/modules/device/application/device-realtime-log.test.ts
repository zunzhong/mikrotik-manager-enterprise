import { describe, expect, it } from 'vitest';
import { routerOsLogAlertMessage, routerOsLogFingerprint } from './device-realtime.service.js';

describe('RouterOS realtime log handling', () => {
  it('does not depend on volatile RouterOS .id values', () => {
    const first = {
      '.id': '*1A',
      time: 'jul/16/2026 12:34:56',
      topics: 'bridge,warning',
      message: 'excessive broadcasts/multicasts, probably a loop',
    };
    const sameAfterReconnect = { ...first, '.id': '*44' };
    expect(routerOsLogFingerprint(first)).toBe(routerOsLogFingerprint(sameAfterReconnect));
  });

  it('uses every RouterOS log field except .id in the fingerprint', () => {
    const original = {
      '.id': '*1A',
      time: 'jul/16/2026 12:34:56',
      topics: 'bridge,warning',
      message: 'excessive broadcasts/multicasts, probably a loop',
      buffer: 'memory',
    };
    expect(routerOsLogFingerprint(original)).not.toBe(
      routerOsLogFingerprint({ ...original, buffer: 'disk' }),
    );
    expect(routerOsLogFingerprint(original)).toBe(
      routerOsLogFingerprint({
        buffer: 'memory',
        message: original.message,
        topics: original.topics,
        time: original.time,
        '.id': '*99',
      }),
    );
    expect(routerOsLogFingerprint(original)).toBe(
      routerOsLogFingerprint({ ...original, _mmeRouterOccurredAt: '2026-07-17 12:34:56' }),
    );
  });

  it('puts RouterOS occurrence time before the RouterOS log description', () => {
    expect(
      routerOsLogAlertMessage({
        time: 'jul/16/2026 12:34:56',
        topics: 'system,error',
        message: 'test error',
      }),
    ).toBe('jul/16/2026 12:34:56: RouterOS error: test error');
  });

  it('uses the normalized RouterOS occurrence date when the raw log has time only', () => {
    expect(
      routerOsLogAlertMessage({
        time: '12:34:56',
        _mmeRouterOccurredAt: '2026-07-16 12:34:56',
        topics: 'warning',
        message: 'bridge warning',
      }),
    ).toBe('2026-07-16 12:34:56: RouterOS warning: bridge warning');
  });
});
