import { EventEmitter } from 'node:events';
import { ConnectionState } from './connection-state.js';
import { RouterOsConnectionError } from '../errors/routeros-error.js';
import { TcpTransport } from '../transport/tcp-transport.js';
import { TlsTransport } from '../transport/tls-transport.js';
import type { RouterClientOptions, Transport } from '../types/index.js';

export interface ConnectionManagerEvents {
  state: [ConnectionState];
  connect: [];
  close: [];
  error: [Error];
}

/**
 * ConnectionManager
 *
 * Owns connection state and the low-level transport lifecycle.
 */
export class ConnectionManager extends EventEmitter {
  private currentState: ConnectionState = ConnectionState.Idle;
  private transport: Transport | null = null;

  public constructor(private readonly options: RouterClientOptions) {
    super();
  }

  public get state(): ConnectionState {
    return this.currentState;
  }

  public get isConnected(): boolean {
    return (
      this.currentState === ConnectionState.Connected ||
      this.currentState === ConnectionState.Authenticated
    );
  }

  public getTransport(): Transport {
    if (!this.transport) {
      throw new RouterOsConnectionError('Transport is not initialized');
    }

    return this.transport;
  }

  public markAuthenticating(): void {
    this.setState(ConnectionState.Authenticating);
  }

  public markAuthenticated(): void {
    this.setState(ConnectionState.Authenticated);
  }

  public async connect(): Promise<void> {
    if (
      this.currentState === ConnectionState.Connected ||
      this.currentState === ConnectionState.Authenticated
    ) {
      return;
    }

    this.setState(ConnectionState.Connecting);

    try {
      this.transport = this.createTransport();
      await this.transport.connect();
      this.setState(ConnectionState.Connected);
      this.emit('connect');
    } catch (error) {
      this.setState(ConnectionState.Error);
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
      this.setState(ConnectionState.Closed);
      throw error;
    }
  }

  public async close(): Promise<void> {
    if (
      this.currentState === ConnectionState.Closed ||
      this.currentState === ConnectionState.Idle
    ) {
      this.setState(ConnectionState.Closed);
      return;
    }

    this.setState(ConnectionState.Closing);

    try {
      await this.transport?.disconnect();
    } finally {
      this.transport = null;
      this.setState(ConnectionState.Closed);
      this.emit('close');
    }
  }

  private createTransport(): Transport {
    const options = {
      host: this.options.host,
      port: this.options.port ?? (this.options.tls ? 8729 : 8728),
      timeoutMs: this.options.timeoutMs ?? 10000,
    };

    if (this.options.transportFactory) return this.options.transportFactory(options);
    if (this.options.tls) {
      const isIpAddress = /^[\d.:]+$/.test(this.options.host);
      return new TlsTransport({
        ...options,
        rejectUnauthorized: this.options.rejectUnauthorized ?? false,
        servername: isIpAddress ? undefined : this.options.host,
      });
    }
    return new TcpTransport(options);
  }

  private setState(state: ConnectionState): void {
    if (this.currentState === state) {
      return;
    }

    this.currentState = state;
    this.emit('state', state);
  }
}
