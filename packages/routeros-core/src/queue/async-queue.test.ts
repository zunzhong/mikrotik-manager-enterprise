import { describe, expect, it } from 'vitest';
import { AsyncQueue } from './async-queue.js';

describe('AsyncQueue', () => {
  it('returns pushed items in FIFO order', async () => {
    const queue = new AsyncQueue<number>();

    queue.push(1);
    queue.push(2);

    expect(await queue.next()).toEqual({ value: 1, done: false });
    expect(await queue.next()).toEqual({ value: 2, done: false });
  });

  it('waits for future items', async () => {
    const queue = new AsyncQueue<string>();

    const result = queue.next();

    queue.push('hello');

    expect(await result).toEqual({ value: 'hello', done: false });
  });

  it('closes pending consumers', async () => {
    const queue = new AsyncQueue<string>();

    const result = queue.next();

    queue.close();

    expect(await result).toEqual({ value: undefined, done: true });
  });

  it('does not allow pushing after close', () => {
    const queue = new AsyncQueue<string>();

    queue.close();

    expect(() => queue.push('x')).toThrow();
  });

  it('supports async iteration', async () => {
    const queue = new AsyncQueue<number>();
    const values: number[] = [];

    queue.push(1);
    queue.push(2);
    queue.close();

    for await (const value of queue) {
      values.push(value);
    }

    expect(values).toEqual([1, 2]);
  });
});
