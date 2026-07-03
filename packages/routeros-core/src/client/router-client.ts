import { EventEmitter } from 'node:events';
import { AuthService } from '../auth/auth-service.js';
import { CommandExecutor } from '../command/command-executor.js';
import type { CommandRequest } from '../command/command-request.js';
import type { CommandResponse } from '../command/command-response.js';
import { ConnectionManager } from '../connection/connection-manager.js';
import type { ConnectionState } from '../connection/connection-state.js';
import { ConnectionState as State } from '../connection/connection-state.js';
import { RouterOsAuthError, RouterOsConnectionError } from '../errors/routeros-error.js';
import type { RouterClientOptions } from '../types/index.js';

/**
 * RouterClient
 *
 * Public SDK entrypoint for RouterOS communication.
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

  public get isAuthenticated(): boolean {
    return this.connection.state === State.Authenticated;
  }

  public async connect(): Promise<void> {
    await this.connection.connect();

    if (this.options.username === undefined) {
      return;
    }

    this.connection.markAuthenticating();

    const auth = new AuthService(this.connection.getTransport());

    await auth.login(
      {
        username: this.options.username,
        password: this.options.password ?? '',
      },
      {
        timeoutMs: this.options.timeoutMs,
      },
    );

    this.connection.markAuthenticated();
    this.emit('authenticated');
  }

  public async command(
    path: string,
    attributes?: Record<string, string | number | boolean>,
    options: Omit<CommandRequest, 'path' | 'attributes'> = {},
  ): Promise<CommandResponse> {
    if (!this.isAuthenticated) {
      throw new RouterOsConnectionError('RouterClient must be authenticated before running commands');
    }

    const executor = new CommandExecutor(this.connection.getTransport());

    return executor.execute({
      path,
      attributes,
      ...options,
    });
  }

  public async close(): Promise<void> {
    await this.connection.close();
  }

  public getOptions(): Readonly<RouterClientOptions> {
    return this.options;
  }
}
