import type { CommandRunner } from '../core/command-runner.js';
import type { RouterOsWireGuardInterface, RouterOsWireGuardPeer } from '../models/vpn.js';

class WireGuardPeerApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsWireGuardPeer[]> {
    return this.runner.print('/interface/wireguard/peers/print') as Promise<RouterOsWireGuardPeer[]>;
  }

  public async add(input: {
    interface: string;
    publicKey: string;
    allowedAddress: string;
    endpointAddress?: string;
    endpointPort?: string | number;
    persistentKeepalive?: string;
    comment?: string;
    disabled?: boolean;
  }): Promise<void> {
    await this.runner.add('/interface/wireguard/peers/add', input);
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/interface/wireguard/peers/remove', id);
  }

  public async enable(id: string): Promise<void> {
    await this.runner.run('/interface/wireguard/peers/enable', { attributes: { numbers: id } });
  }

  public async disable(id: string): Promise<void> {
    await this.runner.run('/interface/wireguard/peers/disable', { attributes: { numbers: id } });
  }
}

export class WireGuardApi {
  public readonly peer: WireGuardPeerApi;

  public constructor(private readonly runner: CommandRunner) {
    this.peer = new WireGuardPeerApi(runner);
  }

  public list(): Promise<RouterOsWireGuardInterface[]> {
    return this.runner.print('/interface/wireguard/print') as Promise<RouterOsWireGuardInterface[]>;
  }

  public async add(input: {
    name: string;
    listenPort?: string | number;
    mtu?: string | number;
    privateKey?: string;
    comment?: string;
    disabled?: boolean;
  }): Promise<void> {
    await this.runner.add('/interface/wireguard/add', input);
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/interface/wireguard/remove', id);
  }

  public async enable(id: string): Promise<void> {
    await this.runner.run('/interface/wireguard/enable', { attributes: { numbers: id } });
  }

  public async disable(id: string): Promise<void> {
    await this.runner.run('/interface/wireguard/disable', { attributes: { numbers: id } });
  }
}
