import { apiGet, apiPost } from '../../lib/api';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: string;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiPost<LoginResult>('/api/v1/auth/login', { email, password }),
  me: () => apiGet<AuthUser>('/api/v1/auth/me'),
  logout: () => apiPost('/api/v1/auth/logout', {}),
};
