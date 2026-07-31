import { describe, expect, it, vi } from 'vitest';
import { config } from '../../config/config.service.js';
import { SyslogFirewallService } from './syslog-firewall.service.js';
import { SyslogReceiver } from './syslog.receiver.js';
import { SyslogRepository } from './syslog.repository.js';
import { receiverConfigurationError, SyslogService } from './syslog.service.js';
import type { SyslogReceiverSettings, SyslogReceiverStatus } from './syslog.types.js';

function statusFor(
  settings: SyslogReceiverSettings,
  overrides: Partial<SyslogReceiverStatus> = {},
): SyslogReceiverStatus {
  return {
    enabled: settings.enabled,
    running: settings.enabled && (settings.udpEnabled || settings.tcpEnabled),
    udpListening: settings.enabled && settings.udpEnabled,
    tcpListening: settings.enabled && settings.tcpEnabled,
    bindAddress: settings.bindAddress,
    port: settings.port,
    received: 0,
    stored: 0,
    dropped: 0,
    parseErrors: 0,
    queueDepth: 0,
    activeTcpClients: 0,
    startedAt: settings.enabled ? new Date(0).toISOString() : null,
    lastMessageAt: null,
    lastError: null,
    ...overrides,
  };
}

function nextSettings(port = 5514): SyslogReceiverSettings {
  return {
    ...config.syslog,
    enabled: true,
    udpEnabled: true,
    tcpEnabled: true,
    bindAddress: '0.0.0.0',
    port,
    acceptUnmatched: true,
  };
}

describe('Syslog server configuration', () => {
  it('requires every requested listener to bind before accepting settings', () => {
    const settings = nextSettings();
    const status = statusFor(settings, {
      udpListening: false,
      lastError: 'UDP: bind EADDRINUSE 0.0.0.0:5514',
    });

    expect(receiverConfigurationError(settings, status)).toContain(
      'Unable to start the requested UDP Syslog listener',
    );
  });

  it('saves settings only after UDP and TCP listeners are active', async () => {
    const settings = nextSettings();
    const saveSettings = vi.fn(async (input: SyslogReceiverSettings) => input);
    const repository = { saveSettings } as unknown as SyslogRepository;
    const receiver = {
      start: vi.fn(async (input: SyslogReceiverSettings) => statusFor(input)),
      status: vi.fn(() => statusFor(settings)),
    } as unknown as SyslogReceiver;
    const sync = vi.fn(async () => undefined);
    const firewall = { sync } as unknown as SyslogFirewallService;
    const service = new SyslogService(repository, receiver, firewall);

    const result = await service.updateSettings(settings);

    expect(saveSettings).toHaveBeenCalledOnce();
    expect(saveSettings).toHaveBeenCalledWith(settings);
    expect(sync).toHaveBeenCalledWith(settings);
    expect(result.receiver.udpListening).toBe(true);
    expect(result.receiver.tcpListening).toBe(true);
  });

  it('restores the receiver when the operating-system firewall cannot be updated', async () => {
    const settings = nextSettings();
    const saveSettings = vi.fn();
    const repository = { saveSettings } as unknown as SyslogRepository;
    const start = vi.fn(async (input: SyslogReceiverSettings) => statusFor(input));
    const receiver = {
      start,
      status: vi.fn(() => statusFor(config.syslog)),
    } as unknown as SyslogReceiver;
    const sync = vi
      .fn()
      .mockRejectedValueOnce(new Error('Access is denied'))
      .mockResolvedValueOnce(undefined);
    const firewall = { sync } as unknown as SyslogFirewallService;
    const service = new SyslogService(repository, receiver, firewall);

    await expect(service.updateSettings(settings)).rejects.toMatchObject({
      code: 'SYSLOG_FIREWALL_UPDATE_FAILED',
      statusCode: 409,
    });
    expect(saveSettings).not.toHaveBeenCalled();
    expect(start).toHaveBeenNthCalledWith(1, settings);
    expect(start).toHaveBeenNthCalledWith(2, config.syslog);
    expect(sync).toHaveBeenNthCalledWith(1, settings);
    expect(sync).toHaveBeenNthCalledWith(2, config.syslog);
  });

  it('restores the previous receiver and does not save an unbindable configuration', async () => {
    const settings = nextSettings();
    const saveSettings = vi.fn();
    const repository = { saveSettings } as unknown as SyslogRepository;
    const start = vi.fn(async (input: SyslogReceiverSettings) =>
      input.port === settings.port
        ? statusFor(input, {
            running: false,
            udpListening: false,
            tcpListening: false,
            lastError: `UDP: bind EADDRINUSE ${input.bindAddress}:${input.port}`,
          })
        : statusFor(input),
    );
    const receiver = {
      start,
      status: vi.fn(() => statusFor(config.syslog)),
    } as unknown as SyslogReceiver;
    const firewall = { sync: vi.fn(async () => undefined) } as unknown as SyslogFirewallService;
    const service = new SyslogService(repository, receiver, firewall);

    await expect(service.updateSettings(settings)).rejects.toMatchObject({
      code: 'SYSLOG_LISTENER_START_FAILED',
      statusCode: 409,
    });
    expect(saveSettings).not.toHaveBeenCalled();
    expect(start).toHaveBeenNthCalledWith(1, settings);
    expect(start).toHaveBeenNthCalledWith(2, config.syslog);
  });

  it('restores the previous receiver when database persistence fails', async () => {
    const settings = nextSettings();
    const repository = {
      saveSettings: vi.fn(async () => {
        throw new Error('database is read-only');
      }),
    } as unknown as SyslogRepository;
    const start = vi.fn(async (input: SyslogReceiverSettings) => statusFor(input));
    const receiver = {
      start,
      status: vi.fn(() => statusFor(config.syslog)),
    } as unknown as SyslogReceiver;
    const firewall = { sync: vi.fn(async () => undefined) } as unknown as SyslogFirewallService;
    const service = new SyslogService(repository, receiver, firewall);

    await expect(service.updateSettings(settings)).rejects.toMatchObject({
      code: 'SYSLOG_SETTINGS_PERSIST_FAILED',
      statusCode: 500,
    });
    expect(start).toHaveBeenNthCalledWith(1, settings);
    expect(start).toHaveBeenNthCalledWith(2, config.syslog);
  });
});
