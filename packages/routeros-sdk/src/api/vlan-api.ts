import type { CommandRunner } from '../core/command-runner.js';
import type { RouterOsVlanInterface } from '../models/vlan.js';

export class VlanApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsVlanInterface[]> {
    return this.runner.print('/interface/vlan/print') as Promise<RouterOsVlanInterface[]>;
  }

  public async add(input: {
    name: string;
    interface: string;
    vlanId: string | number;
    comment?: string;
    disabled?: boolean;
  }): Promise<void> {
    await this.runner.add('/interface/vlan/add', input);
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/interface/vlan/remove', id);
  }

  public async enable(id: string): Promise<void> {
    await this.runner.run('/interface/vlan/enable', { attributes: { numbers: id } });
  }

  public async disable(id: string): Promise<void> {
    await this.runner.run('/interface/vlan/disable', { attributes: { numbers: id } });
  }
}
