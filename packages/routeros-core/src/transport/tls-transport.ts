import { EventEmitter } from 'node:events';
import { connect, type TLSSocket } from 'node:tls';
import { RouterOsConnectionError, RouterOsTimeoutError } from '../errors/routeros-error.js';
import type { TlsTransportOptions, Transport } from '../types/index.js';

/** Native RouterOS API-SSL transport (normally TCP/8729). */
export class TlsTransport extends EventEmitter implements Transport {
  private socket: TLSSocket | null = null;
  private connected = false;
  private readonly chunks: Buffer[] = [];
  private waitingReader: (() => void) | null = null;

  public constructor(private readonly options: TlsTransportOptions) {
    super();
  }

  public async connect(): Promise<void> {
    if (this.connected) return;

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const socket = connect({
        host: this.options.host,
        port: this.options.port,
        rejectUnauthorized: this.options.rejectUnauthorized,
        // Do not send an IP address as SNI. RouterOS certificates commonly use a DNS CN.
        ...(this.options.servername ? { servername: this.options.servername } : {}),
      });
      this.socket = socket;

      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        socket.destroy();
        reject(new RouterOsTimeoutError(`TLS connect timeout after ${this.options.timeoutMs}ms`));
      }, this.options.timeoutMs);

      socket.once('secureConnect', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        this.connected = true;
        resolve();
      });

      socket.once('error', (error) => {
        if (settled) {
          this.connected = false;
          this.waitingReader?.();
          return;
        }
        settled = true;
        clearTimeout(timeout);
        reject(new RouterOsConnectionError(`API-SSL: ${error.message}`));
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
    });
  }

  public async disconnect(): Promise<void> {
    if (!this.socket) return;
    const socket = this.socket;
    await new Promise<void>((resolve) => {
      if (socket.destroyed) return resolve();
      socket.once('close', resolve);
      socket.end();
      setTimeout(() => socket.destroy(), 500).unref();
    });
    this.socket = null;
    this.connected = false;
  }

  public async write(data: Buffer): Promise<void> {
    if (!this.socket || !this.connected) {
      throw new RouterOsConnectionError('TLS transport is not connected');
    }
    await new Promise<void>((resolve, reject) => {
      this.socket!.write(data, (error) =>
        error ? reject(new RouterOsConnectionError(error.message)) : resolve(),
      );
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
