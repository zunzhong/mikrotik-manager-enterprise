import type { CommandRunner } from '../core/command-runner.js';
import type { RouterOsInterface } from '../models/interface.js';

export class InterfaceApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsInterface[]> {
    return this.runner.print('/interface/print') as Promise<RouterOsInterface[]>;
  }

  public async get(id: string): Promise<RouterOsInterface | undefined> {
    const items = (await this.runner.print('/interface/print', { queries: { '.id': id } })) as RouterOsInterface[];
    return items[0];
  }

  public async enable(id: string): Promise<void> {
    await this.runner.run('/interface/enable', { attributes: { numbers: id } });
  }

  public async disable(id: string): Promise<void> {
    await this.runner.run('/interface/disable', { attributes: { numbers: id } });
  }
}
