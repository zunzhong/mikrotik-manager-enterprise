import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../../database/index.js';
import { HttpError } from '../../../errors/http-error.js';
import { authGuardService } from '../../auth/index.js';

export class PermissionGuardService {
  public requirePermission(permissionKey: string) {
    return async (request: FastifyRequest, _reply: FastifyReply) => {
      const user = await authGuardService.authenticate(request);

      if (user.role === 'admin') return;

      const allowed = await prisma.userRole.findFirst({
        where: {
          userId: user.id,
          role: {
            permissions: {
              some: {
                permission: { key: permissionKey },
              },
            },
          },
        },
      });

      if (!allowed) {
        throw new HttpError(403, 'FORBIDDEN', `Missing permission: ${permissionKey}`);
      }
    };
  }

  public requireAnyPermission(permissionKeys: string[]) {
    return async (request: FastifyRequest, _reply: FastifyReply) => {
      const user = await authGuardService.authenticate(request);

      if (user.role === 'admin') return;

      const allowed = await prisma.userRole.findFirst({
        where: {
          userId: user.id,
          role: {
            permissions: {
              some: {
                permission: { key: { in: permissionKeys } },
              },
            },
          },
        },
      });

      if (!allowed) {
        throw new HttpError(403, 'FORBIDDEN', `Missing one of permissions: ${permissionKeys.join(', ')}`);
      }
    };
  }
}

export const permissionGuardService = new PermissionGuardService();
