import { apiGet } from '../../lib/api';
import type { AuthCurrentSession, AuthRbacPrincipalResponse } from './auth-session.types';

export const authSessionApi = {
  current: () => apiGet<AuthCurrentSession>('/api/v1/auth/session/current'),

  rbacPrincipal: () => apiGet<AuthRbacPrincipalResponse>('/api/v1/auth/session/rbac-principal'),
};
