import type { CommandRunner } from '../core/command-runner.js';
import type { RouterOsInterface } from '../models/interface.js';

export class EthernetApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsInterface[]> {
    return this.runner.print('/interface/ethernet/print') as Promise<RouterOsInterface[]>;
  }

  public async get(id: string): Promise<RouterOsInterface | undefined> {
    const items = (await this.runner.print('/interface/ethernet/print', { queries: { '.id': id } })) as RouterOsInterface[];
    return items[0];
  }

  public async enable(id: string): Promise<void> {
    await this.runner.run('/interface/ethernet/enable', { attributes: { numbers: id } });
  }

  public async disable(id: string): Promise<void> {
    await this.runner.run('/interface/ethernet/disable', { attributes: { numbers: id } });
  }

  public async setComment(id: string, comment: string): Promise<void> {
    await this.runner.run('/interface/ethernet/set', { attributes: { numbers: id, comment } });
  }
}
