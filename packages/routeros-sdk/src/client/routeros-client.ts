import crypto from 'node:crypto';
import { EventApi } from '../api/event-api.js';
import { SystemApi } from '../api/system-api.js';
import { attribute } from '../codec/sentence.js';
import { CommandRunner } from '../core/command-runner.js';
import { RouterOsTrapError } from '../protocol/errors.js';
import { firstData, type RouterOsReply } from '../protocol/reply.js';
import { createTransport } from '../transport/create-transport.js';
import type { RouterOsTransport } from '../transport/transport.types.js';

export interface RouterOsClientOptions {
  host: string;
  port?: number;
  username: string;
  password: string;
  timeoutMs?: number;
  tls?: boolean;
  rejectUnauthorized?: boolean;
}

export interface RouterOsCommandOptions {
  timeoutMs?: number;
}

export class RouterOsClient {
  private readonly transport: RouterOsTransport;
  private readonly runner: CommandRunner;

  public readonly system: SystemApi;
  public readonly events: EventApi;

  public constructor(private readonly options: RouterOsClientOptions) {
    this.transport = createTransport({
      host: options.host,
      port: options.port ?? (options.tls ? 8729 : 8728),
      timeoutMs: options.timeoutMs ?? 10000,
      tls: options.tls ?? false,
      rejectUnauthorized: options.rejectUnauthorized ?? false,
    });

    this.runner = new CommandRunner(this.transport, options.timeoutMs ?? 10000);
    this.system = new SystemApi(this.runner);
    this.events = new EventApi(this.transport);
  }

  public async connect(): Promise<void> {
    await this.transport.connect();
    await this.login();
  }

  public close(): void {
    this.transport.close();
  }

  public async command(
    path: string,
    attributes: Record<string, string | number | boolean> = {},
    options: RouterOsCommandOptions = {},
  ): Promise<RouterOsReply[]> {
    await this.transport.send([
      path,
      ...Object.entries(attributes).map(([key, value]) => attribute(key, value)),
    ]);

    return this.transport.readReplySet(options.timeoutMs ?? this.options.timeoutMs ?? 10000);
  }

  public print(path: string, attributes: Record<string, string | number | boolean> = {}): Promise<Record<string, string>[]> {
    return this.runner.print(path, { attributes, normalizeKeys: true });
  }

  public printOne(path: string, attributes: Record<string, string | number | boolean> = {}): Promise<Record<string, string>> {
    return this.runner.printOne(path, { attributes, normalizeKeys: true });
  }

  private async login(): Promise<void> {
    try {
      await this.transport.send([
        '/login',
        attribute('name', this.options.username),
        attribute('password', this.options.password),
      ]);
      await this.transport.readReplySet(this.options.timeoutMs ?? 10000);
    } catch (error) {
      if (error instanceof RouterOsTrapError) {
        await this.tryLegacyLogin();
        return;
      }
      throw error;
    }
  }

  private async tryLegacyLogin(): Promise<void> {
    await this.transport.send(['/login']);
    const replies = await this.transport.readReplySet(this.options.timeoutMs ?? 10000);
    const challenge = firstData(replies).ret;

    if (!challenge) throw new Error('RouterOS legacy login challenge missing');

    const challengeBuffer = Buffer.from(challenge, 'hex');
    const digest = crypto.createHash('md5')
      .update(Buffer.concat([Buffer.from([0]), Buffer.from(this.options.password), challengeBuffer]))
      .digest('hex');

    await this.command('/login', { name: this.options.username, response: `00${digest}` });
  }
}
