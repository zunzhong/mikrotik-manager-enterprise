/**
 * AsyncQueue
 *
 * Minimal async FIFO queue used to bridge event-based socket data and
 * async iterator based protocol processing.
 */
export class AsyncQueue<T> implements AsyncIterable<T> {
  private items: T[] = [];
  private resolvers: Array<(value: IteratorResult<T>) => void> = [];
  private closed = false;

  public push(item: T): void {
    if (this.closed) {
      throw new Error('Cannot push to a closed AsyncQueue');
    }

    const resolver = this.resolvers.shift();

    if (resolver) {
      resolver({ value: item, done: false });
      return;
    }

    this.items.push(item);
  }

  public close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;

    for (const resolver of this.resolvers) {
      resolver({ value: undefined as T, done: true });
    }

    this.resolvers = [];
  }

  public async next(): Promise<IteratorResult<T>> {
    const item = this.items.shift();

    if (item !== undefined) {
      return { value: item, done: false };
    }

    if (this.closed) {
      return { value: undefined as T, done: true };
    }

    return new Promise<IteratorResult<T>>((resolve) => {
      this.resolvers.push(resolve);
    });
  }

  public [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: () => this.next(),
    };
  }
}
