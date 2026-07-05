import type { CommandRunner } from '../core/command-runner.js';
import type { RouterOsLdpNeighbor, RouterOsMplsInterface, RouterOsVplsInterface } from '../models/mpls.js';

class MplsInterfaceApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsMplsInterface[]> {
    return this.runner.print('/mpls/interface/print') as Promise<RouterOsMplsInterface[]>;
  }
}

class LdpNeighborApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsLdpNeighbor[]> {
    return this.runner.print('/mpls/ldp/neighbor/print') as Promise<RouterOsLdpNeighbor[]>;
  }
}

class VplsApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsVplsInterface[]> {
    return this.runner.print('/interface/vpls/print') as Promise<RouterOsVplsInterface[]>;
  }
}

export class MplsApi {
  public readonly interface: MplsInterfaceApi;
  public readonly ldpNeighbor: LdpNeighborApi;
  public readonly vpls: VplsApi;

  public constructor(runner: CommandRunner) {
    this.interface = new MplsInterfaceApi(runner);
    this.ldpNeighbor = new LdpNeighborApi(runner);
    this.vpls = new VplsApi(runner);
  }
}
