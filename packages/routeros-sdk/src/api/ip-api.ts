import type { CommandRunner } from '../core/command-runner.js';
import type { RouterOsDnsSettings, RouterOsIpAddress, RouterOsRoute } from '../models/ip.js';

export interface RouterOsDnsStaticRecord {
  id?: string;
  name?: string;
  address?: string;
  ttl?: string;
  type?: string;
  disabled?: string;
  comment?: string;
}

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
}

class DnsStaticApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsDnsStaticRecord[]> {
    return this.runner.print('/ip/dns/static/print') as Promise<RouterOsDnsStaticRecord[]>;
  }

  public async add(input: {
    name: string;
    address: string;
    ttl?: string;
    comment?: string;
    disabled?: boolean;
  }): Promise<void> {
    await this.runner.add('/ip/dns/static/add', input);
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/ip/dns/static/remove', id);
  }
}

class DnsApi {
  public readonly static: DnsStaticApi;

  public constructor(private readonly runner: CommandRunner) {
    this.static = new DnsStaticApi(runner);
  }

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
