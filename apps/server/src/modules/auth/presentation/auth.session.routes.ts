import type { FastifyInstance } from 'fastify';
import {
  authSessionStateFromRequest,
  currentUserResponseFromAuthState,
  rbacPrincipalFromAuthSession,
} from '../auth.session.js';

export async function authSessionRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/auth/session/current', async (request) => {
    const authState = authSessionStateFromRequest(request);

    return {
      success: true,
      data: currentUserResponseFromAuthState(authState),
    };
  });

  app.get('/api/v1/auth/session/rbac-principal', async (request) => {
    const authState = authSessionStateFromRequest(request);

    if (!authState.authenticated || !authState.principal) {
      return {
        success: true,
        data: {
          authenticated: false,
          principal: null,
        },
      };
    }

    return {
      success: true,
      data: {
        authenticated: true,
        principal: rbacPrincipalFromAuthSession(authState.principal),
      },
    };
  });
}
