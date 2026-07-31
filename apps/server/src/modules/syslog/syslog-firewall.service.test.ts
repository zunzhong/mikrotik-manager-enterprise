import { describe, expect, it } from 'vitest';
import { windowsFirewallArguments } from './syslog-firewall.service.js';
import type { SyslogReceiverSettings } from './syslog.types.js';

const settings: SyslogReceiverSettings = {
  enabled: true,
  udpEnabled: true,
  tcpEnabled: true,
  bindAddress: '0.0.0.0',
  port: 5514,
  retentionDays: 30,
  maxRecords: 500000,
  acceptUnmatched: true,
};

describe('Syslog firewall synchronization', () => {
  it('passes the selected Syslog port to the Windows control script', () => {
    expect(windowsFirewallArguments(settings, 'MME-Control.ps1')).toEqual([
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      'MME-Control.ps1',
      'firewall',
      '-NoOpen',
      '-SyslogPort',
      '5514',
    ]);
  });

  it('removes the Windows rules when the receiver is disabled', () => {
    expect(windowsFirewallArguments({ ...settings, enabled: false }, 'MME-Control.ps1')).toContain(
      'firewall-remove',
    );
  });
});
