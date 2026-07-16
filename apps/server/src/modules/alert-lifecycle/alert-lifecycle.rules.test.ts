import { describe, expect, it } from 'vitest';
import {
  alertInputFromEvent,
  alertRuleKeysToResolve,
  ruleKeyForEventType,
} from './alert-lifecycle.rules.js';

describe('device alert lifecycle rules', () => {
  it.each([
    ['DEVICE_OFFLINE', 'device.offline'],
    ['DEVICE_ONLINE', 'device.online'],
    ['INTERFACE_DOWN', 'interface.down'],
    ['INTERFACE_UP', 'interface.up'],
    ['ROUTEROS_LOG_ERROR', 'log.error'],
    ['ROUTEROS_LOG_WARNING', 'log.warning'],
    ['ROUTEROS_LOGIN_FAILED', 'log.login_failed'],
  ] as const)('maps %s to %s', (eventType, ruleKey) => {
    expect(ruleKeyForEventType(eventType)).toBe(ruleKey);
  });

  it('keeps full RouterOS log metadata and device identity', () => {
    const event = {
      id: 'event-1',
      type: 'ROUTEROS_LOGIN_FAILED' as const,
      severity: 'critical' as const,
      title: 'RouterOS login failed',
      message: 'Core-Router: login failure for user admin',
      createdAt: new Date().toISOString(),
      source: 'routeros-log',
      deviceId: 'device-1',
      deviceName: 'MME Router',
      metadata: {
        deviceIdentity: 'Core-Router',
        routerOsLog: { topics: 'account,error', message: 'login failure for user admin' },
      },
    };
    const alert = alertInputFromEvent(event);
    expect(alert?.ruleKey).toBe('log.login_failed');
    expect(alert?.metadata?.deviceIdentity).toBe('Core-Router');
    expect(alert?.metadata?.eventMetadata).toEqual(event.metadata);
  });

  it('resolves the opposite state rule when state changes', () => {
    const base = {
      id: 'event-1',
      severity: 'critical' as const,
      title: 'state',
      message: 'state',
      createdAt: new Date().toISOString(),
      source: 'test',
      deviceId: 'device-1',
    };
    expect(alertRuleKeysToResolve({ ...base, type: 'INTERFACE_UP' })).toEqual(['interface.down']);
    expect(alertRuleKeysToResolve({ ...base, type: 'DEVICE_OFFLINE' })).toEqual(['device.online']);
  });
});
