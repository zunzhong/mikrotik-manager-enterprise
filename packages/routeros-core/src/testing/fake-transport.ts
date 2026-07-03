import { AsyncQueue } from '../queue/async-queue.js';
import type { Transport } from '../types/index.js';

/**
 * FakeTransport
 *
 * In-memory transport used by unit tests.
 */
export class FakeTransport implements Transport {
  public readonly writes: Buffer[] = [];
  private readonly incoming = new AsyncQueue<Buffer>();
  private connected = false;

  public async connect(): Promise<void> {
    this.connected = true;
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
    this.incoming.close();
  }

  public async write(data: Buffer): Promise<void> {
    this.writes.push(data);
  }

  public pushIncoming(data: Buffer): void {
    this.incoming.push(data);
  }

  public closeIncoming(): void {
    this.incoming.close();
  }

  public read(): AsyncIterable<Buffer> {
    return this.incoming;
  }

  public get isConnected(): boolean {
    return this.connected;
  }
}
