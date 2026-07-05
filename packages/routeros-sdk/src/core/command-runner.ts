import { commandBuilder, type RouterOsCommandBuildOptions } from './command-builder.js';
import { normalizeRecord, type RouterOsRecord } from './routeros-record.js';
import type { RouterOsTransport } from '../transport/transport.types.js';
import type { RouterOsReply } from '../protocol/reply.js';

export interface RunCommandOptions extends RouterOsCommandBuildOptions {
  timeoutMs?: number;
  normalizeKeys?: boolean;
}

export class CommandRunner {
  public constructor(
    private readonly transport: RouterOsTransport,
    private readonly defaultTimeoutMs = 10000,
  ) {}

  public async run(path: string, options: RunCommandOptions = {}): Promise<RouterOsReply[]> {
    await this.transport.send(commandBuilder.build(path, options));
    return this.transport.readReplySet(options.timeoutMs ?? this.defaultTimeoutMs);
  }

  public async print(path: string, options: RunCommandOptions = {}): Promise<RouterOsRecord[]> {
    const replies = await this.run(path, options);
    const records = replies.filter((reply) => reply.type === '!re').map((reply) => reply.attributes);
    return options.normalizeKeys === false ? records : records.map(normalizeRecord);
  }

  public async printOne(path: string, options: RunCommandOptions = {}): Promise<RouterOsRecord> {
    return (await this.print(path, options))[0] ?? {};
  }

  public async add(path: string, attributes: Record<string, string | number | boolean | undefined | null>): Promise<void> {
    await this.run(path, { attributes });
  }

  public async set(path: string, attributes: Record<string, string | number | boolean | undefined | null>): Promise<void> {
    await this.run(path, { attributes });
  }

  public async remove(path: string, id: string): Promise<void> {
    await this.run(path, { attributes: { numbers: id } });
  }
}
