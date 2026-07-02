import { EventEmitter } from 'node:events';
import { Socket } from 'node:net';
import {
  RouterOsConnectionError,
  RouterOsTimeoutError,
} from '../errors/routeros-error.js';
import type { TcpTransportOptions, Transport } from '../types/index.js';

export class TcpTransport extends EventEmitter implements Transport {
  private socket: Socket | null = null;
  private connected = false;
  private readonly chunks: Buffer[] = [];
  private waitingReader: (() => void) | null = null;

  constructor(private readonly options: TcpTransportOptions) {
    super();
  }

  public async connect(): Promise<void> {
    if (this.connected) return;

    await new Promise<void>((resolve, reject) => {
      const socket = new Socket();
      this.socket = socket;

      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new RouterOsTimeoutError(`TCP connect timeout after ${this.options.timeoutMs}ms`));
      }, this.options.timeoutMs);

      socket.once('connect', () => {
        clearTimeout(timeout);
        this.connected = true;
        resolve();
      });

      socket.once('error', (error) => {
        clearTimeout(timeout);
        reject(new RouterOsConnectionError(error.message));
      });

      socket.on('data', (chunk: Buffer) => {
        this.chunks.push(chunk);
        this.waitingReader?.();
      });

      socket.once('close', () => {
        this.connected = false;
        this.waitingReader?.();
        this.emit('close');
      });

      socket.connect(this.options.port, this.options.host);
    });
  }

  public async disconnect(): Promise<void> {
    if (!this.socket) return;

    await new Promise<void>((resolve) => {
      const socket = this.socket;
      if (!socket || socket.destroyed) {
        resolve();
        return;
      }

      socket.once('close', () => resolve());
      socket.end();

      setTimeout(() => {
        if (!socket.destroyed) socket.destroy();
      }, 500);
    });

    this.socket = null;
    this.connected = false;
  }

  public async write(data: Buffer): Promise<void> {
    if (!this.socket || !this.connected) {
      throw new RouterOsConnectionError('TCP transport is not connected');
    }

    await new Promise<void>((resolve, reject) => {
      this.socket!.write(data, (error) => {
        if (error) {
          reject(new RouterOsConnectionError(error.message));
          return;
        }
        resolve();
      });
    });
  }

  public async *read(): AsyncIterable<Buffer> {
    while (this.connected || this.chunks.length > 0) {
      const chunk = this.chunks.shift();
      if (chunk) {
        yield chunk;
        continue;
      }

      await new Promise<void>((resolve) => {
        this.waitingReader = resolve;
      });
      this.waitingReader = null;
    }
  }
}
