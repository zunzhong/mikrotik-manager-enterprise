import type { FastifyInstance } from 'fastify';
import { routerOsProbeInputSchema, routerOsSdkAdapter } from './routeros-sdk.adapter.js';

export async function routerosRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/routeros/health', async () => ({
    success: true,
    data: {
      module: 'routeros',
      sdk: '@mme/routeros-sdk',
      status: 'ready',
      endpoints: [
        'POST /api/v1/routeros/probe',
        'POST /api/v1/routeros/identity',
        'POST /api/v1/routeros/resource',
        'POST /api/v1/routeros/routerboard',
      ],
    },
  }));

  app.post('/api/v1/routeros/probe', async (request, reply) => {
    try {
      const input = routerOsProbeInputSchema.parse(request.body);
      return { success: true, data: await routerOsSdkAdapter.probe(input) };
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
      return { success: true, data: await routerOsSdkAdapter.identity(input) };
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
      return { success: true, data: await routerOsSdkAdapter.resource(input) };
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

  app.post('/api/v1/routeros/routerboard', async (request, reply) => {
    try {
      const input = routerOsProbeInputSchema.parse(request.body);
      return { success: true, data: await routerOsSdkAdapter.routerboard(input) };
    } catch (error) {
      reply.code(400);
      return {
        success: false,
        error: {
          code: 'ROUTEROS_ROUTERBOARD_FAILED',
          message: error instanceof Error ? error.message : 'RouterOS routerboard failed',
        },
      };
    }
  });
}
