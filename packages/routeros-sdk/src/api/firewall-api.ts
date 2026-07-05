import type { CommandRunner } from '../core/command-runner.js';
import type {
  RouterOsFirewallAddressListEntry,
  RouterOsFirewallFilterRule,
  RouterOsFirewallNatRule,
} from '../models/firewall.js';

class FirewallFilterApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsFirewallFilterRule[]> {
    return this.runner.print('/ip/firewall/filter/print') as Promise<RouterOsFirewallFilterRule[]>;
  }

  public async add(input: {
    chain: string;
    action: string;
    srcAddress?: string;
    dstAddress?: string;
    protocol?: string;
    srcPort?: string | number;
    dstPort?: string | number;
    inInterface?: string;
    outInterface?: string;
    connectionState?: string;
    comment?: string;
    disabled?: boolean;
  }): Promise<void> {
    await this.runner.add('/ip/firewall/filter/add', input);
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/ip/firewall/filter/remove', id);
  }

  public async enable(id: string): Promise<void> {
    await this.runner.run('/ip/firewall/filter/enable', { attributes: { numbers: id } });
  }

  public async disable(id: string): Promise<void> {
    await this.runner.run('/ip/firewall/filter/disable', { attributes: { numbers: id } });
  }
}

class FirewallNatApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsFirewallNatRule[]> {
    return this.runner.print('/ip/firewall/nat/print') as Promise<RouterOsFirewallNatRule[]>;
  }

  public async add(input: {
    chain: string;
    action: string;
    srcAddress?: string;
    dstAddress?: string;
    protocol?: string;
    srcPort?: string | number;
    dstPort?: string | number;
    toAddresses?: string;
    toPorts?: string | number;
    outInterface?: string;
    comment?: string;
    disabled?: boolean;
  }): Promise<void> {
    await this.runner.add('/ip/firewall/nat/add', input);
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/ip/firewall/nat/remove', id);
  }

  public async enable(id: string): Promise<void> {
    await this.runner.run('/ip/firewall/nat/enable', { attributes: { numbers: id } });
  }

  public async disable(id: string): Promise<void> {
    await this.runner.run('/ip/firewall/nat/disable', { attributes: { numbers: id } });
  }
}

class FirewallAddressListApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsFirewallAddressListEntry[]> {
    return this.runner.print('/ip/firewall/address-list/print') as Promise<RouterOsFirewallAddressListEntry[]>;
  }

  public async add(input: {
    list: string;
    address: string;
    timeout?: string;
    comment?: string;
    disabled?: boolean;
  }): Promise<void> {
    await this.runner.add('/ip/firewall/address-list/add', input);
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/ip/firewall/address-list/remove', id);
  }
}

export class FirewallApi {
  public readonly filter: FirewallFilterApi;
  public readonly nat: FirewallNatApi;
  public readonly addressList: FirewallAddressListApi;

  public constructor(runner: CommandRunner) {
    this.filter = new FirewallFilterApi(runner);
    this.nat = new FirewallNatApi(runner);
    this.addressList = new FirewallAddressListApi(runner);
  }
}
