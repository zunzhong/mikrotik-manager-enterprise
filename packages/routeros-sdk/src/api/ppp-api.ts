import type { CommandRunner } from '../core/command-runner.js';
import type { RouterOsPppActive, RouterOsPppProfile, RouterOsPppSecret, RouterOsPppoeClient } from '../models/ppp.js';

class PppSecretApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsPppSecret[]> {
    return this.runner.print('/ppp/secret/print') as Promise<RouterOsPppSecret[]>;
  }

  public async add(input: {
    name: string;
    password: string;
    service?: string;
    profile?: string;
    localAddress?: string;
    remoteAddress?: string;
    comment?: string;
    disabled?: boolean;
  }): Promise<void> {
    await this.runner.add('/ppp/secret/add', input);
  }

  public async enable(id: string): Promise<void> {
    await this.runner.run('/ppp/secret/enable', { attributes: { numbers: id } });
  }

  public async disable(id: string): Promise<void> {
    await this.runner.run('/ppp/secret/disable', { attributes: { numbers: id } });
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/ppp/secret/remove', id);
  }
}

class PppActiveApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsPppActive[]> {
    return this.runner.print('/ppp/active/print') as Promise<RouterOsPppActive[]>;
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/ppp/active/remove', id);
  }
}

class PppProfileApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsPppProfile[]> {
    return this.runner.print('/ppp/profile/print') as Promise<RouterOsPppProfile[]>;
  }

  public async add(input: {
    name: string;
    localAddress?: string;
    remoteAddress?: string;
    dnsServer?: string;
    rateLimit?: string;
    comment?: string;
  }): Promise<void> {
    await this.runner.add('/ppp/profile/add', input);
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/ppp/profile/remove', id);
  }
}

class PppoeClientApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsPppoeClient[]> {
    return this.runner.print('/interface/pppoe-client/print') as Promise<RouterOsPppoeClient[]>;
  }

  public async enable(id: string): Promise<void> {
    await this.runner.run('/interface/pppoe-client/enable', { attributes: { numbers: id } });
  }

  public async disable(id: string): Promise<void> {
    await this.runner.run('/interface/pppoe-client/disable', { attributes: { numbers: id } });
  }
}

export class PppApi {
  public readonly secret: PppSecretApi;
  public readonly active: PppActiveApi;
  public readonly profile: PppProfileApi;
  public readonly pppoeClient: PppoeClientApi;

  public constructor(runner: CommandRunner) {
    this.secret = new PppSecretApi(runner);
    this.active = new PppActiveApi(runner);
    this.profile = new PppProfileApi(runner);
    this.pppoeClient = new PppoeClientApi(runner);
  }
}
