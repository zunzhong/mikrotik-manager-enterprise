import type { CommandRunner } from '../core/command-runner.js';
import type { RouterOsQueueTree, RouterOsQueueType, RouterOsSimpleQueue } from '../models/queue.js';

class SimpleQueueApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsSimpleQueue[]> {
    return this.runner.print('/queue/simple/print') as Promise<RouterOsSimpleQueue[]>;
  }

  public async add(input: {
    name: string;
    target: string;
    maxLimit?: string;
    limitAt?: string;
    parent?: string;
    priority?: string | number;
    queue?: string;
    comment?: string;
    disabled?: boolean;
  }): Promise<void> {
    await this.runner.add('/queue/simple/add', input);
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/queue/simple/remove', id);
  }

  public async enable(id: string): Promise<void> {
    await this.runner.run('/queue/simple/enable', { attributes: { numbers: id } });
  }

  public async disable(id: string): Promise<void> {
    await this.runner.run('/queue/simple/disable', { attributes: { numbers: id } });
  }
}

class QueueTreeApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsQueueTree[]> {
    return this.runner.print('/queue/tree/print') as Promise<RouterOsQueueTree[]>;
  }

  public async add(input: {
    name: string;
    parent: string;
    packetMark?: string;
    maxLimit?: string;
    limitAt?: string;
    priority?: string | number;
    queue?: string;
    comment?: string;
    disabled?: boolean;
  }): Promise<void> {
    await this.runner.add('/queue/tree/add', input);
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/queue/tree/remove', id);
  }
}

class QueueTypeApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsQueueType[]> {
    return this.runner.print('/queue/type/print') as Promise<RouterOsQueueType[]>;
  }
}

export class QueueApi {
  public readonly simple: SimpleQueueApi;
  public readonly tree: QueueTreeApi;
  public readonly type: QueueTypeApi;

  public constructor(runner: CommandRunner) {
    this.simple = new SimpleQueueApi(runner);
    this.tree = new QueueTreeApi(runner);
    this.type = new QueueTypeApi(runner);
  }
}
