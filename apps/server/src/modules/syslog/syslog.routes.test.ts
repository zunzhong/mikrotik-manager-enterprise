import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { auditService } from '../audit/index.js';
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
});
