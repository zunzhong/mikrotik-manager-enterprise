import type { AuthenticatedUser } from '../modules/auth/domain/auth-user.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}
