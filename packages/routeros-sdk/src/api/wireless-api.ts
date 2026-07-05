import type { CommandRunner } from '../core/command-runner.js';
import type { RouterOsWifiInterface, RouterOsWirelessInterface } from '../models/wireless.js';

export class WirelessApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsWirelessInterface[]> {
    return this.runner.print('/interface/wireless/print') as Promise<RouterOsWirelessInterface[]>;
  }

  public async enable(id: string): Promise<void> {
    await this.runner.run('/interface/wireless/enable', { attributes: { numbers: id } });
  }

  public async disable(id: string): Promise<void> {
    await this.runner.run('/interface/wireless/disable', { attributes: { numbers: id } });
  }
}

export class WifiApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsWifiInterface[]> {
    return this.runner.print('/interface/wifi/print') as Promise<RouterOsWifiInterface[]>;
  }

  public async enable(id: string): Promise<void> {
    await this.runner.run('/interface/wifi/enable', { attributes: { numbers: id } });
  }

  public async disable(id: string): Promise<void> {
    await this.runner.run('/interface/wifi/disable', { attributes: { numbers: id } });
  }
}
