import { useEffect, useState } from 'react';

export interface AsyncDataState<T> {
  data?: T;
  loading: boolean;
  error?: string;
  refresh: () => void;
}

export function useAsyncData<T>(loader: () => Promise<T>): AsyncDataState<T> {
  const [data, setData] = useState<T | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    setError(undefined);

    loader()
      .then((result) => {
        if (!mounted) return;
        setData(result);
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

  return {
    data,
    loading,
    error,
    refresh: () => setVersion((current) => current + 1),
  };
}
