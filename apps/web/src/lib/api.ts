const explicitApiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

/**
 * API base URL strategy:
 *
 * - Local development default: use relative `/api` path and Vite proxy.
 * - Optional override: set VITE_API_BASE_URL=http://localhost:3000
 */
function buildApiUrl(path: string): string {
  if (explicitApiBaseUrl && explicitApiBaseUrl.length > 0) {
    return `${explicitApiBaseUrl}${path}`;
  }

  return path;
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

export async function apiGet<T>(path: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl(path), {
      headers: {
        Accept: 'application/json',
      },
    });
  } catch {
    throw new ApiError(
      `Cannot reach backend API for ${path}. Make sure @mme/server is running on http://localhost:3000.`,
      undefined,
      path,
    );
  }

  if (!response.ok) {
    throw new ApiError(`API request failed with status ${response.status}`, response.status, path);
  }

  const json = (await response.json()) as { success: boolean; data?: T; error?: { message?: string } };

  if (!json.success) {
    throw new ApiError(json.error?.message ?? 'API returned unsuccessful response', response.status, path);
  }

  return json.data as T;
}
