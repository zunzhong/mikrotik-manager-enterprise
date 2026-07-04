import type { FastifyInstance } from 'fastify';
import { topologyService } from '../application/topology.service.js';

export async function topologyRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/topology', async () => ({
    success: true,
    data: await topologyService.getTopology(),
  }));
}
