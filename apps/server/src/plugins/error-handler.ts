import type { FastifyInstance } from 'fastify';
import { HttpError } from '../errors/http-error.js';

export async function registerErrorHandler(app: FastifyInstance): Promise<void> {
  app.setErrorHandler((error: Error, request, reply) => {
    request.log.error(error);

    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      },
    });
  });
}
