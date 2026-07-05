import type { CommandRunner } from '../core/command-runner.js';
import type { RouterOsDhcpLease, RouterOsDhcpNetwork, RouterOsDhcpServer } from '../models/dhcp.js';

class DhcpServerApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsDhcpServer[]> {
    return this.runner.print('/ip/dhcp-server/print') as Promise<RouterOsDhcpServer[]>;
  }

  public async add(input: {
    name: string;
    interface: string;
    addressPool?: string;
    leaseTime?: string;
    authoritative?: string;
    disabled?: boolean;
    comment?: string;
  }): Promise<void> {
    await this.runner.add('/ip/dhcp-server/add', input);
  }

  public async enable(id: string): Promise<void> {
    await this.runner.run('/ip/dhcp-server/enable', { attributes: { numbers: id } });
  }

  public async disable(id: string): Promise<void> {
    await this.runner.run('/ip/dhcp-server/disable', { attributes: { numbers: id } });
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/ip/dhcp-server/remove', id);
  }
}

class DhcpLeaseApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsDhcpLease[]> {
    return this.runner.print('/ip/dhcp-server/lease/print') as Promise<RouterOsDhcpLease[]>;
  }

  public async makeStatic(id: string): Promise<void> {
    await this.runner.run('/ip/dhcp-server/lease/make-static', { attributes: { numbers: id } });
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/ip/dhcp-server/lease/remove', id);
  }

  public async block(id: string): Promise<void> {
    await this.runner.run('/ip/dhcp-server/lease/block-access', { attributes: { numbers: id } });
  }

  public async unblock(id: string): Promise<void> {
    await this.runner.run('/ip/dhcp-server/lease/unblock-access', { attributes: { numbers: id } });
  }
}

class DhcpNetworkApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsDhcpNetwork[]> {
    return this.runner.print('/ip/dhcp-server/network/print') as Promise<RouterOsDhcpNetwork[]>;
  }

  public async add(input: {
    address: string;
    gateway?: string;
    dnsServer?: string;
    domain?: string;
    comment?: string;
  }): Promise<void> {
    await this.runner.add('/ip/dhcp-server/network/add', input);
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/ip/dhcp-server/network/remove', id);
  }
}

export class DhcpApi {
  public readonly server: DhcpServerApi;
  public readonly lease: DhcpLeaseApi;
  public readonly network: DhcpNetworkApi;

  public constructor(runner: CommandRunner) {
    this.server = new DhcpServerApi(runner);
    this.lease = new DhcpLeaseApi(runner);
    this.network = new DhcpNetworkApi(runner);
  }
}
