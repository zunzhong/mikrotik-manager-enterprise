import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { alertService } from '../application/alert.service.js';
import { alertRoutes } from './alert.routes.js';

describe('alert deletion routes', () => {
  afterEach(() => vi.restoreAllMocks());

  it('deletes one alert by id', async () => {
    const remove = vi.spyOn(alertService, 'delete').mockResolvedValue({
      deleted: true,
      id: 'alert-1',
    });
    const app = Fastify();
    await app.register(alertRoutes);

    const response = await app.inject({ method: 'DELETE', url: '/api/v1/alerts/alert-1' });

    expect(response.statusCode).toBe(200);
    expect(remove).toHaveBeenCalledWith('alert-1');
    expect(response.json().data).toEqual({ deleted: true, id: 'alert-1' });
    await app.close();
  });

  it('deletes all alerts for only the selected device', async () => {
    const removeAll = vi.spyOn(alertService, 'deleteAll').mockResolvedValue({
      deleted: 3,
      deviceId: 'device-1',
    });
    const app = Fastify();
    await app.register(alertRoutes);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/alerts?deviceId=device-1',
    });

    expect(response.statusCode).toBe(200);
    expect(removeAll).toHaveBeenCalledWith('device-1');
    expect(response.json().data).toEqual({ deleted: 3, deviceId: 'device-1' });
    await app.close();
  });
});
