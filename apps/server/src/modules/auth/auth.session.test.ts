import type { FastifyRequest } from 'fastify';
import { describe, expect, it } from 'vitest';
import { tokenService } from './application/token.service.js';
import { authSessionStateFromRequest } from './auth.session.js';

function requestWithHeaders(headers: Record<string, string>): FastifyRequest {
  return { headers } as FastifyRequest;
}

describe('authSessionStateFromRequest', () => {
  it('creates a trusted admin principal from a valid bearer token', () => {
    const token = tokenService.sign({
      userId: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
    });

    const state = authSessionStateFromRequest(
      requestWithHeaders({ authorization: `Bearer ${token}` }),
    );

    expect(state.authenticated).toBe(true);
    expect(state.principal).toMatchObject({
      userId: 'admin-1',
      email: 'admin@example.com',
      roleIds: ['admin'],
      isSuperAdmin: true,
      source: 'session',
    });
  });

  it('rejects an invalid bearer token instead of falling back to headers', () => {
    const state = authSessionStateFromRequest(
      requestWithHeaders({
        authorization: 'Bearer invalid',
        'x-user-id': 'forged-admin',
        'x-rbac-super-admin': 'true',
      }),
    );

    expect(state.authenticated).toBe(false);
    expect(state.reason).toContain('Invalid');
  });
});
