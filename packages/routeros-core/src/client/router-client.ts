import { EventEmitter } from 'node:events';
import { ConnectionManager } from '../connection/connection-manager.js';
import type { ConnectionState } from '../connection/connection-state.js';
import type { RouterClientOptions } from '../types/index.js';

/**
 * RouterClient
 *
 * Public SDK entrypoint for RouterOS communication.
 *
 * Current stage:
 * - TCP connect
 * - close lifecycle
 * - connection state events
 *
 * Next stages:
 * - authentication
 * - command pipeline
 * - streaming commands
 */
export class RouterClient extends EventEmitter {
  private readonly connection: ConnectionManager;

  public constructor(private readonly options: RouterClientOptions) {
    super();

    this.connection = new ConnectionManager(options);

    this.connection.on('state', (state: ConnectionState) => this.emit('state', state));
    this.connection.on('connect', () => this.emit('connect'));
    this.connection.on('close', () => this.emit('close'));
    this.connection.on('error', (error: Error) => this.emit('error', error));
  }

  public get state(): ConnectionState {
    return this.connection.state;
  }

  public get isConnected(): boolean {
    return this.connection.isConnected;
  }

  public async connect(): Promise<void> {
    await this.connection.connect();
  }

  public async close(): Promise<void> {
    await this.connection.close();
  }

  public getOptions(): Readonly<RouterClientOptions> {
    return this.options;
  }
}
