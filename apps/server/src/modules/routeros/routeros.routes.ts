import type { FastifyInstance } from 'fastify';
import { routerOsProbeInputSchema, routerOsSdkAdapter } from './routeros-sdk.adapter.js';

export async function routerosRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/routeros/health', async () => ({
    success: true,
    data: {
      module: 'routeros',
      sdk: '@mme/routeros-sdk',
      status: 'ready',
    },
  }));

  app.post('/api/v1/routeros/probe', async (request, reply) => {
    try {
      const input = routerOsProbeInputSchema.parse(request.body);
      const data = await routerOsSdkAdapter.probe(input);

      return { success: true, data };
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: {
          code: 'ROUTEROS_PROBE_FAILED',
          message: error instanceof Error ? error.message : 'RouterOS probe failed',
        },
      };
    }
  });

  app.post('/api/v1/routeros/identity', async (request, reply) => {
    try {
      const input = routerOsProbeInputSchema.parse(request.body);
      const data = await routerOsSdkAdapter.identity(input);

      return { success: true, data };
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: {
          code: 'ROUTEROS_IDENTITY_FAILED',
          message: error instanceof Error ? error.message : 'RouterOS identity failed',
        },
      };
    }
  });

  app.post('/api/v1/routeros/resource', async (request, reply) => {
    try {
      const input = routerOsProbeInputSchema.parse(request.body);
      const data = await routerOsSdkAdapter.resource(input);

      return { success: true, data };
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: {
          code: 'ROUTEROS_RESOURCE_FAILED',
          message: error instanceof Error ? error.message : 'RouterOS resource failed',
        },
      };
    }
  });
}
