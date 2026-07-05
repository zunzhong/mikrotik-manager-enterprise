import type { CommandRunner } from '../core/command-runner.js';
import type { RouterOsBridge, RouterOsBridgePort } from '../models/bridge.js';

class BridgePortApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsBridgePort[]> {
    return this.runner.print('/interface/bridge/port/print') as Promise<RouterOsBridgePort[]>;
  }

  public async add(input: {
    bridge: string;
    interface: string;
    pvid?: string | number;
    frameTypes?: string;
    ingressFiltering?: boolean;
    comment?: string;
  }): Promise<void> {
    await this.runner.add('/interface/bridge/port/add', input);
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/interface/bridge/port/remove', id);
  }

  public async enable(id: string): Promise<void> {
    await this.runner.run('/interface/bridge/port/enable', { attributes: { numbers: id } });
  }

  public async disable(id: string): Promise<void> {
    await this.runner.run('/interface/bridge/port/disable', { attributes: { numbers: id } });
  }
}

export class BridgeApi {
  public readonly port: BridgePortApi;

  public constructor(private readonly runner: CommandRunner) {
    this.port = new BridgePortApi(runner);
  }

  public list(): Promise<RouterOsBridge[]> {
    return this.runner.print('/interface/bridge/print') as Promise<RouterOsBridge[]>;
  }

  public async add(input: { name: string; vlanFiltering?: boolean; protocolMode?: string; comment?: string }): Promise<void> {
    await this.runner.add('/interface/bridge/add', input);
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/interface/bridge/remove', id);
  }

  public async enable(id: string): Promise<void> {
    await this.runner.run('/interface/bridge/enable', { attributes: { numbers: id } });
  }

  public async disable(id: string): Promise<void> {
    await this.runner.run('/interface/bridge/disable', { attributes: { numbers: id } });
  }

  public async setVlanFiltering(id: string, enabled: boolean): Promise<void> {
    await this.runner.run('/interface/bridge/set', { attributes: { numbers: id, vlanFiltering: enabled } });
  }
}
