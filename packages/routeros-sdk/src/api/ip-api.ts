import type { CommandRunner } from '../core/command-runner.js';
import type { RouterOsDnsSettings, RouterOsIpAddress, RouterOsRoute } from '../models/ip.js';

class IpAddressApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsIpAddress[]> {
    return this.runner.print('/ip/address/print') as Promise<RouterOsIpAddress[]>;
  }

  public async add(input: {
    address: string;
    interface: string;
    network?: string;
    comment?: string;
    disabled?: boolean;
  }): Promise<void> {
    await this.runner.add('/ip/address/add', input);
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/ip/address/remove', id);
  }

  public async enable(id: string): Promise<void> {
    await this.runner.run('/ip/address/enable', { attributes: { numbers: id } });
  }

  public async disable(id: string): Promise<void> {
    await this.runner.run('/ip/address/disable', { attributes: { numbers: id } });
  }
}

class IpRouteApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsRoute[]> {
    return this.runner.print('/ip/route/print') as Promise<RouterOsRoute[]>;
  }

  public async add(input: {
    dstAddress: string;
    gateway: string;
    distance?: string | number;
    routingTable?: string;
    comment?: string;
    disabled?: boolean;
  }): Promise<void> {
    await this.runner.add('/ip/route/add', input);
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/ip/route/remove', id);
  }

  public async enable(id: string): Promise<void> {
    await this.runner.run('/ip/route/enable', { attributes: { numbers: id } });
  }

  public async disable(id: string): Promise<void> {
    await this.runner.run('/ip/route/disable', { attributes: { numbers: id } });
  }
}

class DnsApi {
  public constructor(private readonly runner: CommandRunner) {}

  public settings(): Promise<RouterOsDnsSettings> {
    return this.runner.printOne('/ip/dns/print') as Promise<RouterOsDnsSettings>;
  }

  public async set(input: {
    servers?: string;
    allowRemoteRequests?: boolean;
    cacheSize?: string;
  }): Promise<void> {
    await this.runner.set('/ip/dns/set', input);
  }
}

export class IpApi {
  public readonly address: IpAddressApi;
  public readonly route: IpRouteApi;
  public readonly dns: DnsApi;

  public constructor(runner: CommandRunner) {
    this.address = new IpAddressApi(runner);
    this.route = new IpRouteApi(runner);
    this.dns = new DnsApi(runner);
  }
}
