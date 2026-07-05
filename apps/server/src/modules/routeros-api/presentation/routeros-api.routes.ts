import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { routerOsProbeService } from '../application/routeros-probe.service.js';

const routerOsProbeSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive().optional(),
  username: z.string().min(1),
  password: z.string().default(''),
  timeoutMs: z.number().int().positive().optional(),
});

export async function routerOsApiRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/v1/routeros/probe', async (request) => {
    const input = routerOsProbeSchema.parse(request.body ?? {});

    return {
      success: true,
      data: await routerOsProbeService.probe(input),
    };
  });

  app.post('/api/v1/routeros/test', async (request) => {
    const input = routerOsProbeSchema.parse(request.body ?? {});

    return {
      success: true,
      data: await routerOsProbeService.test(input),
    };
  });
}
