import type { CommandRunner } from '../core/command-runner.js';
import type { RouterOsBfdConfiguration, RouterOsRoutingRule, RouterOsRoutingTable, RouterOsVrf } from '../models/routing.js';

class RoutingTableApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsRoutingTable[]> {
    return this.runner.print('/routing/table/print') as Promise<RouterOsRoutingTable[]>;
  }

  public async add(input: { name: string; fib?: boolean; disabled?: boolean; comment?: string }): Promise<void> {
    await this.runner.add('/routing/table/add', input);
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/routing/table/remove', id);
  }
}

class RoutingRuleApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsRoutingRule[]> {
    return this.runner.print('/routing/rule/print') as Promise<RouterOsRoutingRule[]>;
  }

  public async add(input: {
    action: string;
    table?: string;
    srcAddress?: string;
    dstAddress?: string;
    interface?: string;
    minPrefix?: string | number;
    disabled?: boolean;
    comment?: string;
  }): Promise<void> {
    await this.runner.add('/routing/rule/add', input);
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/routing/rule/remove', id);
  }
}

class VrfApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsVrf[]> {
    return this.runner.print('/ip/vrf/print') as Promise<RouterOsVrf[]>;
  }

  public async add(input: { name: string; interfaces?: string; disabled?: boolean; comment?: string }): Promise<void> {
    await this.runner.add('/ip/vrf/add', input);
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/ip/vrf/remove', id);
  }
}

class BfdApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsBfdConfiguration[]> {
    return this.runner.print('/routing/bfd/configuration/print') as Promise<RouterOsBfdConfiguration[]>;
  }
}

export class RoutingApi {
  public readonly table: RoutingTableApi;
  public readonly rule: RoutingRuleApi;
  public readonly vrf: VrfApi;
  public readonly bfd: BfdApi;

  public constructor(runner: CommandRunner) {
    this.table = new RoutingTableApi(runner);
    this.rule = new RoutingRuleApi(runner);
    this.vrf = new VrfApi(runner);
    this.bfd = new BfdApi(runner);
  }
}
