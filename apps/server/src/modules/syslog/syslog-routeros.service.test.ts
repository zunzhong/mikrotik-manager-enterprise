import { describe, expect, it } from 'vitest';
import { buildRouterOsSyslogActionProfiles } from './syslog-routeros.service.js';

describe('RouterOS Syslog action profiles', () => {
  it('uses the RouterOS 7.18+ Syslog parameters without the removed bsd-syslog flag', () => {
    const profiles = buildRouterOsSyslogActionProfiles('7.19.2 (stable)', '10.0.0.11', 5514);

    expect(profiles[0]).toEqual({
      name: 'routeros-7.18+',
      parameters: expect.objectContaining({
        target: 'remote',
        'remote-log-format': 'syslog',
        'remote-protocol': 'udp',
        'remote-port': '10.0.0.11:5514',
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

  it('formats an IPv6 receiver endpoint unambiguously', () => {
    const profiles = buildRouterOsSyslogActionProfiles('7.20', '2001:db8::10', 5514);

    expect(profiles[0]?.parameters['remote-port']).toBe('[2001:db8::10]:5514');
  });
});
