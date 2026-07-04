import { apiDelete, apiGet, apiPost } from '../../lib/api';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  token?: string;
  user: AuthUser;
}

export interface AuthSession {
  id: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  revokedAt?: string;
}

export const authApi = {
  login: (email: string, password: string, rememberMe = false) =>
    apiPost<LoginResult>('/api/v1/auth/login', { email, password, rememberMe }),
  refresh: (refreshToken: string) => apiPost<{ accessToken: string }>('/api/v1/auth/refresh', { refreshToken }),
  me: () => apiGet<AuthUser>('/api/v1/auth/me'),
  sessions: () => apiGet<AuthSession[]>('/api/v1/auth/sessions'),
  revokeSession: (id: string) => apiDelete(`/api/v1/auth/sessions/${id}`),
  logoutAll: () => apiPost('/api/v1/auth/logout-all', {}),
  logout: () => apiPost('/api/v1/auth/logout', {}),
};
