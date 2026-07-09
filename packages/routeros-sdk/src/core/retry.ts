export interface RetryOptions {
  attempts?: number;
  delayMs?: number;
  backoffFactor?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const delayMs = options.delayMs ?? 500;
  const backoffFactor = options.backoffFactor ?? 2;

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleep(delayMs * Math.pow(backoffFactor, attempt - 1));
      }
    }
  }

  throw lastError;
}
