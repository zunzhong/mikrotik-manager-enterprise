import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { auditService } from '../audit/index.js';
import { systemPreferencesService } from '../system/application/system-preferences.service.js';
import { syslogRouterOsService } from './syslog-routeros.service.js';
import { syslogRoutes } from './syslog.routes.js';
import { syslogService } from './syslog.service.js';
import type { SyslogReceiverSettings, SyslogReceiverStatus } from './syslog.types.js';

afterEach(() => vi.restoreAllMocks());

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

const receiver: SyslogReceiverStatus = {
  enabled: true,
  running: true,
  udpListening: true,
  tcpListening: true,
  bindAddress: '0.0.0.0',
  port: 5514,
  received: 0,
  stored: 0,
  dropped: 0,
  parseErrors: 0,
  queueDepth: 0,
  activeTcpClients: 0,
  startedAt: new Date(0).toISOString(),
  lastMessageAt: null,
  lastError: null,
};

describe('Syslog routes', () => {
  it('filters one calendar day using the configured MME timezone', async () => {
    vi.spyOn(systemPreferencesService, 'get').mockReturnValue({
      timeZone: 'Asia/Ho_Chi_Minh',
      language: 'vi',
      updatedAt: new Date(0).toISOString(),
    });
    const list = vi.spyOn(syslogService, 'list').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
      pages: 1,
    });
    const app = Fastify();
    await app.register(syslogRoutes);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/syslog/messages?date=2026-08-01',
      headers: { 'x-user-id': 'admin-1', 'x-rbac-super-admin': 'true' },
    });

    expect(response.statusCode).toBe(200);
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({
        from: new Date('2026-07-31T17:00:00.000Z'),
        to: new Date('2026-08-01T16:59:59.999Z'),
      }),
    );
    await app.close();
  });

  it('downloads a daily log with its device-and-date file name', async () => {
    vi.spyOn(syslogService, 'dailyFile').mockResolvedValue({
      fileName: 'Giao_An_Office_2026-08-01.log',
      content: Buffer.from('router message\n'),
      size: 15,
      modifiedAt: new Date(0).toISOString(),
    });
    const app = Fastify();
    await app.register(syslogRoutes);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/syslog/files/device-1/2026-08-01/download',
      headers: { 'x-user-id': 'admin-1', 'x-rbac-super-admin': 'true' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="Giao_An_Office_2026-08-01.log"',
    );
    expect(response.body).toBe('router message\n');
    await app.close();
  });

  it('records a manual server configuration in the application audit log', async () => {
    vi.spyOn(syslogService, 'updateSettings').mockResolvedValue({ settings, receiver });
    const record = vi.spyOn(auditService, 'record').mockResolvedValue({
      id: 'audit-1',
      action: 'syslog.server.settings_updated',
      actor: { type: 'user' },
      entity: { type: 'config', id: 'syslog-server' },
      severity: 'info',
      status: 'success',
      summary: 'updated',
      createdAt: new Date(0).toISOString(),
    });
    const app = Fastify();
    await app.register(syslogRoutes);

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/syslog/settings',
      headers: {
        'x-user-id': 'admin-1',
        'x-user-name': 'Administrator',
        'x-rbac-super-admin': 'true',
      },
      payload: settings,
    });

    expect(response.statusCode).toBe(200);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'syslog.server.settings_updated',
        actor: expect.objectContaining({ id: 'admin-1', name: 'Administrator' }),
        entity: expect.objectContaining({ type: 'config', id: 'syslog-server' }),
        metadata: expect.objectContaining({ source: 'manual-ui' }),
      }),
    );
    await app.close();
  });

  it('records a rejected manual server configuration in the application audit log', async () => {
    vi.spyOn(syslogService, 'updateSettings').mockRejectedValue(
      new Error('UDP: bind EADDRINUSE 0.0.0.0:5514'),
    );
    const record = vi.spyOn(auditService, 'record').mockResolvedValue({
      id: 'audit-2',
      action: 'syslog.server.settings_update_failed',
      actor: { type: 'user' },
      entity: { type: 'config', id: 'syslog-server' },
      severity: 'warning',
      status: 'failure',
      summary: 'failed',
      createdAt: new Date(0).toISOString(),
    });
    const app = Fastify();
    await app.register(syslogRoutes);

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/syslog/settings',
      headers: {
        'x-user-id': 'admin-1',
        'x-user-name': 'Administrator',
        'x-rbac-super-admin': 'true',
      },
      payload: settings,
    });

    expect(response.statusCode).toBe(500);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'syslog.server.settings_update_failed',
        actor: expect.objectContaining({ id: 'admin-1', name: 'Administrator' }),
        status: 'failure',
        metadata: expect.objectContaining({
          source: 'manual-ui',
          error: expect.stringContaining('EADDRINUSE'),
        }),
      }),
    );
    await app.close();
  });

  it('verifies RouterOS action/rule delivery through the running Syslog receiver', async () => {
    const waitForStoredMessage = vi
      .spyOn(syslogService, 'waitForStoredMessage')
      .mockResolvedValue(true);
    vi.spyOn(syslogRouterOsService, 'configure').mockImplementation(
      async (deviceId, input, verifyDelivery) => ({
        deviceId,
        deviceName: 'Router 1',
        success: true,
        action: 'MMESyslog',
        serverAddress: input.serverAddress,
        port: input.port,
        protocol: 'udp',
        topics: input.topics,
        routerOsVersion: '7.19.2',
        configurationProfile: 'routeros-7.18+',
        actionVerified: true,
        ruleVerified: true,
        deliveryVerified: await verifyDelivery!('router-test-marker'),
        warning: undefined,
        duplicateRulesRemoved: 0,
      }),
    );
    vi.spyOn(auditService, 'record').mockResolvedValue({
      id: 'audit-3',
      action: 'syslog.routeros.configured',
      actor: { type: 'user' },
      entity: { type: 'config', id: 'routeros-syslog' },
      severity: 'info',
      status: 'success',
      summary: 'configured',
      createdAt: new Date(0).toISOString(),
    });
    const app = Fastify();
    await app.register(syslogRoutes);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/syslog/routeros/configure',
      headers: {
        'x-user-id': 'admin-1',
        'x-rbac-super-admin': 'true',
      },
      payload: {
        deviceIds: ['device-1'],
        serverAddress: '10.0.0.12',
        port: 514,
        topics: 'info,!account,!debug',
        confirm: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.results[0]).toMatchObject({
      actionVerified: true,
      ruleVerified: true,
      deliveryVerified: true,
    });
    expect(waitForStoredMessage).toHaveBeenCalledWith('router-test-marker');
    await app.close();
  });
});
