import type { CommandRunner } from '../core/command-runner.js';
import type { RouterOsIpAddress, RouterOsRoute } from '../models/ip.js';

class IpAddressApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsIpAddress[]> {
    return this.runner.print('/ip/address/print') as Promise<RouterOsIpAddress[]>;
  }

  public async add(input: { address: string; interface: string; comment?: string; disabled?: boolean }): Promise<void> {
    await this.runner.add('/ip/address/add', input);
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/ip/address/remove', id);
  }
}

class IpRouteApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsRoute[]> {
    return this.runner.print('/ip/route/print') as Promise<RouterOsRoute[]>;
  }
}

export class IpApi {
  public readonly address: IpAddressApi;
  public readonly route: IpRouteApi;

  public constructor(runner: CommandRunner) {
    this.address = new IpAddressApi(runner);
    this.route = new IpRouteApi(runner);
  }
}
