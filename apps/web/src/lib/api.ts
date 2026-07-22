const explicitApiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

const envDevAuthEnabled = import.meta.env.VITE_AUTH_DEV_HEADERS_ENABLED as string | undefined;
const envDevAuthUserId = import.meta.env.VITE_AUTH_DEV_USER_ID as string | undefined;
const envDevAuthEmail = import.meta.env.VITE_AUTH_DEV_EMAIL as string | undefined;
const envDevAuthName = import.meta.env.VITE_AUTH_DEV_NAME as string | undefined;
const envDevAuthRoles = import.meta.env.VITE_AUTH_DEV_ROLES as string | undefined;
const envDevAuthPermissions = import.meta.env.VITE_AUTH_DEV_PERMISSIONS as string | undefined;
const envDevAuthSuperAdmin = import.meta.env.VITE_AUTH_DEV_SUPER_ADMIN as string | undefined;

export function buildApiUrl(path: string): string {
  if (explicitApiBaseUrl && explicitApiBaseUrl.length > 0) {
    return `${explicitApiBaseUrl}${path}`;
  }

  return path;
}

function isTruthy(value: string | undefined | null): boolean {
  if (!value) {
    return false;
  }

  return ['1', 'true', 'yes', 'y', 'on'].includes(value.toLowerCase());
}

function readLocalStorage(key: string): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    return window.localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

function firstValue(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => typeof value === 'string' && value.length > 0);
}

function getDevAuthHeaders(): Record<string, string> {
  const enabled = isTruthy(firstValue(readLocalStorage('mme.devAuth.enabled'), envDevAuthEnabled));

  if (!enabled) {
    return {};
  }

  const headers: Record<string, string> = {};
  const userId = firstValue(readLocalStorage('mme.devAuth.userId'), envDevAuthUserId);
  const email = firstValue(readLocalStorage('mme.devAuth.email'), envDevAuthEmail);
  const name = firstValue(readLocalStorage('mme.devAuth.name'), envDevAuthName);
  const roles = firstValue(readLocalStorage('mme.devAuth.roles'), envDevAuthRoles);
  const permissions = firstValue(
    readLocalStorage('mme.devAuth.permissions'),
    envDevAuthPermissions,
  );
  const superAdmin = firstValue(readLocalStorage('mme.devAuth.superAdmin'), envDevAuthSuperAdmin);

  if (userId) headers['x-user-id'] = userId;
  if (email) headers['x-user-email'] = email;
  if (name) headers['x-user-name'] = name;
  if (roles) headers['x-rbac-roles'] = roles;
  if (permissions) headers['x-rbac-permissions'] = permissions;
  if (superAdmin) headers['x-rbac-super-admin'] = superAdmin;

  return headers;
}

export function mergeHeaders(headers: HeadersInit | undefined): HeadersInit {
  const token = readLocalStorage('mme-token');

  return {
    ...(headers as Record<string, string> | undefined),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...getDevAuthHeaders(),
  };
}

export class ApiError extends Error {
  public constructor(
    message: string,
    public readonly status?: number,
    public readonly path?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function readJson<T>(response: Response, path: string): Promise<T> {
  const json = (await response.json().catch(() => null)) as {
    success?: boolean;
    data?: T;
    error?: string | { message?: string };
  } | null;

  if (!response.ok) {
    if (response.status === 401 && path !== '/api/v1/auth/login') {
      window.localStorage.removeItem('mme-token');
      window.location.assign('/login');
    }

    const message =
      typeof json?.error === 'string'
        ? json.error
        : (json?.error?.message ?? `API request failed with status ${response.status}`);
    throw new ApiError(message, response.status, path);
  }

  if (!json?.success) {
    const errorMessage =
      typeof json?.error === 'string'
        ? json.error
        : (json?.error?.message ?? 'API returned unsuccessful response');

    throw new ApiError(errorMessage, response.status, path);
  }

  return json.data as T;
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  try {
    const response = await fetch(buildApiUrl(path), {
      ...init,
      headers: mergeHeaders(init.headers),
    });

    return readJson<T>(response, path);
  } catch (error) {
    if (error instanceof ApiError) throw error;

    throw new ApiError(
      `Cannot reach backend API for ${path}.
Make sure @mme/server is running.`,
      undefined,
      path,
    );
  }
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { headers: { Accept: 'application/json' } });
}

export function apiPost<T>(path: string, body: unknown = {}): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function apiPatch<T>(path: string, body: unknown = {}): Promise<T> {
  return request<T>(path, {
    method: 'PATCH',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function apiPut<T>(path: string, body: unknown = {}): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
}
