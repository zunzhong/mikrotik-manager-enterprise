import type { FastifyInstance } from 'fastify';
import { complianceService } from '../application/compliance.service.js';

export async function complianceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/compliance/policies', async () => {
    return {
      success: true,
      data: complianceService.listPolicies(),
    };
  });

  app.get('/api/v1/devices/:id/compliance/reports', async (request) => {
    const params = request.params as { id: string };

    return {
      success: true,
      data: await complianceService.listReports(params.id),
    };
  });

  app.post('/api/v1/devices/:id/compliance/scan', async (request, reply) => {
    const params = request.params as { id: string };

    return reply.status(202).send({
      success: true,
      data: await complianceService.scan(params.id),
    });
  });
}
