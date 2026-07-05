export interface PollingOptions {
  intervalMs?: number;
  signal?: AbortSignal;
  onError?: (error: unknown) => void;
}

export async function poll<T>(
  fn: () => Promise<T>,
  onData: (data: T) => void,
  options: PollingOptions = {},
): Promise<void> {
  const intervalMs = options.intervalMs ?? 1000;

  while (!options.signal?.aborted) {
    try {
      onData(await fn());
    } catch (error) {
      options.onError?.(error);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
