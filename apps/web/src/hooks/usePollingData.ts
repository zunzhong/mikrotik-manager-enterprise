import { useCallback, useEffect, useState } from 'react';

export interface PollingDataState<T> {
  data?: T;
  loading: boolean;
  error?: string;
  lastUpdatedAt?: Date;
  refresh: () => void;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  intervalMs: number;
  setIntervalMs: (intervalMs: number) => void;
}

export function usePollingData<T>(
  loader: () => Promise<T>,
  options: { enabled?: boolean; intervalMs?: number } = {},
): PollingDataState<T> {
  const [data, setData] = useState<T | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | undefined>();
  const [version, setVersion] = useState(0);
  const [enabled, setEnabled] = useState(options.enabled ?? true);
  const [intervalMs, setIntervalMs] = useState(options.intervalMs ?? 30000);

  const refresh = useCallback(() => setVersion((current) => current + 1), []);

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    setError(undefined);

    loader()
      .then((result) => {
        if (!mounted) return;
        setData(result);
        setLastUpdatedAt(new Date());
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [loader, version]);

  useEffect(() => {
    if (!enabled) return;

    const timer = window.setInterval(() => {
      refresh();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [enabled, intervalMs, refresh]);

  return {
    data,
    loading,
    error,
    lastUpdatedAt,
    refresh,
    enabled,
    setEnabled,
    intervalMs,
    setIntervalMs,
  };
}
