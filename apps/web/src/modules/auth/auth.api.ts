import { apiDelete, apiGet, apiPatch, apiPost } from '../../lib/api';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  isActive?: boolean;
  passwordConfigured?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResult {
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  user?: AuthUser;
  mfaRequired?: boolean;
  message?: string;
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

export interface MfaSetupResult {
  secret: string;
  otpauthUrl: string;
  currentCode: string;
  note?: string;
}

export const authApi = {
  login: (email: string, password: string, rememberMe = false, mfaCode?: string) =>
    apiPost<LoginResult>('/api/v1/auth/login', { email, password, rememberMe, mfaCode }),

  refresh: (refreshToken: string) =>
    apiPost<{ accessToken: string }>('/api/v1/auth/refresh', { refreshToken }),

  me: () => apiGet<AuthUser>('/api/v1/auth/me'),

  updateProfile: (input: { email?: string; name?: string | null }) =>
    apiPatch<AuthUser>('/api/v1/auth/me', input),

  sessions: () => apiGet<AuthSession[]>('/api/v1/auth/sessions'),

  revokeSession: (id: string) => apiDelete(`/api/v1/auth/sessions/${id}`),

  logoutAll: () => apiPost('/api/v1/auth/logout-all', {}),

  logout: () => apiPost('/api/v1/auth/logout', {}),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiPost('/api/v1/auth/change-password', { currentPassword, newPassword }),

  mfaStatus: () =>
    apiGet<{ configured: boolean; enabled: boolean; enabledAt?: string }>(
      '/api/v1/auth/mfa/status',
    ),

  mfaSetup: () => apiPost<MfaSetupResult>('/api/v1/auth/mfa/setup', {}),

  mfaEnable: (code: string) => apiPost('/api/v1/auth/mfa/enable', { code }),

  mfaDisable: (code: string) => apiPost('/api/v1/auth/mfa/disable', { code }),

  requestPasswordReset: (email: string) =>
    apiPost('/api/v1/auth/password-reset/request', { email }),

  confirmPasswordReset: (token: string, newPassword: string) =>
    apiPost('/api/v1/auth/password-reset/confirm', { token, newPassword }),
};
