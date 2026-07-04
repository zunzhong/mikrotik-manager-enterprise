import type { FastifyReply, FastifyRequest } from 'fastify';
import { HttpError } from '../../../errors/http-error.js';
import { authRepository } from '../infrastructure/auth.repository.js';
import { tokenService } from './token.service.js';

export class AuthGuardService {
  public async authenticate(request: FastifyRequest) {
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new HttpError(401, 'UNAUTHORIZED', 'Missing authorization token');
    }

    const payload = tokenService.verify(token);

    if (!payload) {
      throw new HttpError(401, 'UNAUTHORIZED', 'Invalid or expired token');
    }

    const user = await authRepository.findUserById(payload.userId);

    if (!user || !user.isActive) {
      throw new HttpError(401, 'UNAUTHORIZED', 'User is inactive or missing');
    }

    request.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    return request.user;
  }

  public requireAuth() {
    return async (request: FastifyRequest, _reply: FastifyReply) => {
      await this.authenticate(request);
    };
  }

  public requireRole(roles: string[]) {
    return async (request: FastifyRequest, _reply: FastifyReply) => {
      const user = await this.authenticate(request);

      if (!roles.includes(user.role)) {
        throw new HttpError(403, 'FORBIDDEN', 'Insufficient permissions');
      }
    };
  }
}

export const authGuardService = new AuthGuardService();
