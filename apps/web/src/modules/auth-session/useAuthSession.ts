import { useCallback, useEffect, useState } from 'react';
import { authSessionApi } from './auth-session.api';
import type { AuthCurrentSession, AuthRbacPrincipalResponse } from './auth-session.types';

export interface UseAuthSessionOptions {
  enabled?: boolean;
  includeRbacPrincipal?: boolean;
}

export interface UseAuthSessionResult {
  current: AuthCurrentSession | null;
  rbacPrincipal: AuthRbacPrincipalResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAuthSession(options: UseAuthSessionOptions = {}): UseAuthSessionResult {
  const { enabled = true, includeRbacPrincipal = true } = options;
  const [current, setCurrent] = useState<AuthCurrentSession | null>(null);
  const [rbacPrincipal, setRbacPrincipal] = useState<AuthRbacPrincipalResponse | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [nextCurrent, nextRbacPrincipal] = await Promise.all([
        authSessionApi.current(),
        includeRbacPrincipal ? authSessionApi.rbacPrincipal() : Promise.resolve(null),
      ]);

      setCurrent(nextCurrent);
      setRbacPrincipal(nextRbacPrincipal);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot load auth session');
    } finally {
      setLoading(false);
    }
  }, [includeRbacPrincipal]);

  useEffect(() => {
    if (enabled) {
      void refresh();
    }
  }, [enabled, refresh]);

  return {
    current,
    rbacPrincipal,
    loading,
    error,
    refresh,
  };
}
