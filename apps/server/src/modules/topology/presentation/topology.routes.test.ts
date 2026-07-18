import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { topologyService } from '../application/topology.service.js';
import { topologyRoutes } from './topology.routes.js';

describe('enterprise topology routes', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns topology scoped to one managed device', async () => {
    const getTopology = vi.spyOn(topologyService, 'getTopology').mockResolvedValue({
      nodes: [],
      links: [],
      summary: {
        nodes: 0,
        links: 0,
        devices: 1,
        managedLinks: 0,
        connectedDevices: 0,
        isolatedDevices: 1,
        confirmedLinks: 0,
        inferredLinks: 0,
        unresolvedLinks: 0,
        manualLinks: 0,
        evidenceSources: 0,
      },
      scope: 'device:device-1',
      generatedAt: new Date().toISOString(),
      managedDevices: [],
      layout: {},
    });
    const app = Fastify();
    await app.register(topologyRoutes);

    const response = await app.inject({ method: 'GET', url: '/api/v1/topology/devices/device-1' });

    expect(response.statusCode).toBe(200);
    expect(getTopology).toHaveBeenCalledWith('device-1');
    expect(response.json().data.scope).toBe('device:device-1');
    await app.close();
  });

  it('validates and persists a shared node layout', async () => {
    const saveLayout = vi.spyOn(topologyService, 'saveLayout').mockResolvedValue({
      scope: 'device:device-1',
      saved: 2,
    });
    const app = Fastify();
    await app.register(topologyRoutes);

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/topology/layout',
      payload: {
        deviceId: 'device-1',
        positions: [
          { nodeId: 'device-1', x: 100, y: 200 },
          { nodeId: 'device-2', x: 300, y: 400 },
        ],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(saveLayout).toHaveBeenCalledWith('device-1', [
      { nodeId: 'device-1', x: 100, y: 200 },
      { nodeId: 'device-2', x: 300, y: 400 },
    ]);
    await app.close();
  });

  it('creates a locked manual link without allowing a self-link', async () => {
    const create = vi.spyOn(topologyService, 'createManualLink').mockResolvedValue({
      id: 'manual-1',
      sourceNodeId: 'device-1',
      targetNodeId: 'device-2',
      label: 'WAN backup',
      locked: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const app = Fastify();
    await app.register(topologyRoutes);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/topology/links/manual',
      payload: { sourceNodeId: 'device-1', targetNodeId: 'device-2', label: 'WAN backup' },
    });

    expect(response.statusCode).toBe(200);
    expect(create).toHaveBeenCalledWith({
      sourceNodeId: 'device-1',
      targetNodeId: 'device-2',
      label: 'WAN backup',
    });
    await app.close();
  });
});
