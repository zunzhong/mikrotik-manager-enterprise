import type { CommandRunner } from '../core/command-runner.js';
import type { RouterOsIpService } from '../models/service.js';

export class ServiceApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsIpService[]> {
    return this.runner.print('/ip/service/print') as Promise<RouterOsIpService[]>;
  }

  public async enable(id: string): Promise<void> {
    await this.runner.run('/ip/service/enable', { attributes: { numbers: id } });
  }

  public async disable(id: string): Promise<void> {
    await this.runner.run('/ip/service/disable', { attributes: { numbers: id } });
  }

  public async setPort(id: string, port: string | number): Promise<void> {
    await this.runner.run('/ip/service/set', { attributes: { numbers: id, port } });
  }

  public async setAddress(id: string, address: string): Promise<void> {
    await this.runner.run('/ip/service/set', { attributes: { numbers: id, address } });
  }
}
