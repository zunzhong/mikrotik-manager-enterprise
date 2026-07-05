import type { CommandRunner } from '../core/command-runner.js';
import { mapInterface } from '../mappers/interface.mapper.js';
import { mapList } from '../mappers/mapper-utils.js';
import type { RouterOsInterface } from '../models/interface.js';

export class InterfaceApi {
  public constructor(private readonly runner: CommandRunner) {}
  public async list(): Promise<RouterOsInterface[]> { return mapList(await this.runner.print('/interface/print'), mapInterface); }
  public async get(id: string): Promise<RouterOsInterface | undefined> { return mapList(await this.runner.print('/interface/print', { queries: { '.id': id } }), mapInterface)[0]; }
  public async enable(id: string): Promise<void> { await this.runner.run('/interface/enable', { attributes: { numbers: id } }); }
  public async disable(id: string): Promise<void> { await this.runner.run('/interface/disable', { attributes: { numbers: id } }); }
}
