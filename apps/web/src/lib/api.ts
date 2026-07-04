const explicitApiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

function buildApiUrl(path: string): string {
  return explicitApiBaseUrl && explicitApiBaseUrl.length > 0
    ? `${explicitApiBaseUrl}${path}`
    : path;
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
  if (!response.ok) {
    throw new ApiError(`API request failed with status ${response.status}`, response.status, path);
  }

  const json = (await response.json()) as {
    success: boolean;
    data?: T;
    error?: { message?: string };
  };

  if (!json.success) {
    throw new ApiError(
      json.error?.message ?? 'API returned unsuccessful response',
      response.status,
      path,
    );
  }

  return json.data as T;
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  try {
    const response = await fetch(buildApiUrl(path), init);
    return readJson<T>(response, path);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      `Cannot reach backend API for ${path}. Make sure @mme/server is running.`,
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

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
}
