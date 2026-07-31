import { describe, expect, it } from 'vitest';
import {
  buildRouterOsSyslogActionProfiles,
  isParameterCompatibilityError,
  routerOsSyslogTestCommand,
} from './syslog-routeros.service.js';

describe('RouterOS Syslog action profiles', () => {
  it('uses the RouterOS 7.18+ Syslog parameters without the removed bsd-syslog flag', () => {
    const profiles = buildRouterOsSyslogActionProfiles('7.19.2 (stable)', '10.0.0.11', 5514);

    expect(profiles[0]).toEqual({
      name: 'routeros-7.18+',
      parameters: expect.objectContaining({
        target: 'remote',
        remote: '10.0.0.11',
        'remote-log-format': 'syslog',
        'remote-protocol': 'udp',
        'remote-port': '5514',
        'syslog-time-format': 'iso8601',
      }),
    });
    expect(profiles.every((profile) => !('bsd-syslog' in profile.parameters))).toBe(true);
  });

  it('keeps a legacy profile for older RouterOS releases', () => {
    const profiles = buildRouterOsSyslogActionProfiles('7.17.2', '10.0.0.11', 5514);

    expect(profiles[0]).toEqual({
      name: 'routeros-legacy',
      parameters: expect.objectContaining({
        remote: '10.0.0.11',
        'remote-port': '5514',
        'bsd-syslog': 'yes',
      }),
    });
    expect(profiles.at(-1)?.name).toBe('compatible-minimal');
  });

  it('retains the combined endpoint as a compatibility fallback', () => {
    const profiles = buildRouterOsSyslogActionProfiles('7.20', '2001:db8::10', 5514);

    expect(profiles[0]?.parameters).toMatchObject({
      remote: '2001:db8::10',
      'remote-port': '5514',
    });
    expect(profiles[1]).toMatchObject({
      name: 'routeros-7.18+-endpoint',
      parameters: {
        'remote-port': '[2001:db8::10]:5514',
      },
    });
  });

  it('falls back when RouterOS rejects an endpoint in remote-port', () => {
    expect(
      isParameterCompatibilityError(
        new Error('value of remote-port contains invalid trailing characters'),
      ),
    ).toBe(true);
  });

  it('selects a RouterOS test command covered by the configured topics', () => {
    expect(routerOsSyslogTestCommand('info,!account,!debug')).toBe('/log/info');
    expect(routerOsSyslogTestCommand('error,warning')).toBe('/log/warning');
    expect(routerOsSyslogTestCommand('system,!debug')).toBeNull();
  });
});
