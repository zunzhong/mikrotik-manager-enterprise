import type { CommandRunner } from '../core/command-runner.js';
import type {
  RouterOsOspfArea,
  RouterOsOspfInstance,
  RouterOsOspfInterfaceTemplate,
  RouterOsOspfNeighbor,
} from '../models/ospf.js';

class OspfInstanceApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsOspfInstance[]> {
    return this.runner.print('/routing/ospf/instance/print') as Promise<RouterOsOspfInstance[]>;
  }

  public async add(input: {
    name: string;
    version?: string;
    routerId?: string;
    vrf?: string;
    disabled?: boolean;
    comment?: string;
  }): Promise<void> {
    await this.runner.add('/routing/ospf/instance/add', input);
  }
}

class OspfAreaApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsOspfArea[]> {
    return this.runner.print('/routing/ospf/area/print') as Promise<RouterOsOspfArea[]>;
  }

  public async add(input: {
    name: string;
    instance: string;
    areaId?: string;
    type?: string;
    disabled?: boolean;
    comment?: string;
  }): Promise<void> {
    await this.runner.add('/routing/ospf/area/add', input);
  }
}

class OspfInterfaceTemplateApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsOspfInterfaceTemplate[]> {
    return this.runner.print('/routing/ospf/interface-template/print') as Promise<RouterOsOspfInterfaceTemplate[]>;
  }

  public async add(input: {
    area: string;
    interfaces?: string;
    networks?: string;
    cost?: string | number;
    priority?: string | number;
    type?: string;
    disabled?: boolean;
    comment?: string;
  }): Promise<void> {
    await this.runner.add('/routing/ospf/interface-template/add', input);
  }
}

class OspfNeighborApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsOspfNeighbor[]> {
    return this.runner.print('/routing/ospf/neighbor/print') as Promise<RouterOsOspfNeighbor[]>;
  }
}

export class OspfApi {
  public readonly instance: OspfInstanceApi;
  public readonly area: OspfAreaApi;
  public readonly interfaceTemplate: OspfInterfaceTemplateApi;
  public readonly neighbor: OspfNeighborApi;

  public constructor(runner: CommandRunner) {
    this.instance = new OspfInstanceApi(runner);
    this.area = new OspfAreaApi(runner);
    this.interfaceTemplate = new OspfInterfaceTemplateApi(runner);
    this.neighbor = new OspfNeighborApi(runner);
  }
}
