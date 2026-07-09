import type { CommandRunner } from '../core/command-runner.js';
import type {
  RouterOsIpSecIdentity,
  RouterOsIpSecPeer,
  RouterOsIpSecPolicy,
} from '../models/vpn.js';

class IpSecPeerApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsIpSecPeer[]> {
    return this.runner.print('/ip/ipsec/peer/print') as Promise<RouterOsIpSecPeer[]>;
  }

  public async enable(id: string): Promise<void> {
    await this.runner.run('/ip/ipsec/peer/enable', { attributes: { numbers: id } });
  }

  public async disable(id: string): Promise<void> {
    await this.runner.run('/ip/ipsec/peer/disable', { attributes: { numbers: id } });
  }
}

class IpSecIdentityApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsIpSecIdentity[]> {
    return this.runner.print('/ip/ipsec/identity/print') as Promise<RouterOsIpSecIdentity[]>;
  }
}

class IpSecPolicyApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsIpSecPolicy[]> {
    return this.runner.print('/ip/ipsec/policy/print') as Promise<RouterOsIpSecPolicy[]>;
  }

  public async enable(id: string): Promise<void> {
    await this.runner.run('/ip/ipsec/policy/enable', { attributes: { numbers: id } });
  }

  public async disable(id: string): Promise<void> {
    await this.runner.run('/ip/ipsec/policy/disable', { attributes: { numbers: id } });
  }
}

export class IpSecApi {
  public readonly peer: IpSecPeerApi;
  public readonly identity: IpSecIdentityApi;
  public readonly policy: IpSecPolicyApi;

  public constructor(runner: CommandRunner) {
    this.peer = new IpSecPeerApi(runner);
    this.identity = new IpSecIdentityApi(runner);
    this.policy = new IpSecPolicyApi(runner);
  }
}
