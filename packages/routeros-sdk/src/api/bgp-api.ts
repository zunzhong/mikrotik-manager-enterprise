import type { CommandRunner } from '../core/command-runner.js';
import type {
  RouterOsBgpAdvertisement,
  RouterOsBgpConnection,
  RouterOsBgpSession,
  RouterOsBgpTemplate,
} from '../models/bgp.js';

class BgpConnectionApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsBgpConnection[]> {
    return this.runner.print('/routing/bgp/connection/print') as Promise<RouterOsBgpConnection[]>;
  }

  public async add(input: {
    name: string;
    remoteAddress?: string;
    remoteAs?: string | number;
    localAddress?: string;
    localAs?: string | number;
    templates?: string;
    routingTable?: string;
    disabled?: boolean;
    comment?: string;
  }): Promise<void> {
    await this.runner.add('/routing/bgp/connection/add', input);
  }

  public async enable(id: string): Promise<void> {
    await this.runner.run('/routing/bgp/connection/enable', { attributes: { numbers: id } });
  }

  public async disable(id: string): Promise<void> {
    await this.runner.run('/routing/bgp/connection/disable', { attributes: { numbers: id } });
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/routing/bgp/connection/remove', id);
  }
}

class BgpTemplateApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsBgpTemplate[]> {
    return this.runner.print('/routing/bgp/template/print') as Promise<RouterOsBgpTemplate[]>;
  }

  public async add(input: {
    name: string;
    as?: string | number;
    routerId?: string;
    routingTable?: string;
    addressFamilies?: string;
    disabled?: boolean;
    comment?: string;
  }): Promise<void> {
    await this.runner.add('/routing/bgp/template/add', input);
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove('/routing/bgp/template/remove', id);
  }
}

class BgpSessionApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(): Promise<RouterOsBgpSession[]> {
    return this.runner.print('/routing/bgp/session/print') as Promise<RouterOsBgpSession[]>;
  }
}

class BgpAdvertisementApi {
  public constructor(private readonly runner: CommandRunner) {}

  public list(peer?: string): Promise<RouterOsBgpAdvertisement[]> {
    return this.runner.print('/routing/bgp/advertisements/print', {
      attributes: peer ? { peer } : {},
    }) as Promise<RouterOsBgpAdvertisement[]>;
  }
}

export class BgpApi {
  public readonly connection: BgpConnectionApi;
  public readonly template: BgpTemplateApi;
  public readonly session: BgpSessionApi;
  public readonly advertisement: BgpAdvertisementApi;

  public constructor(runner: CommandRunner) {
    this.connection = new BgpConnectionApi(runner);
    this.template = new BgpTemplateApi(runner);
    this.session = new BgpSessionApi(runner);
    this.advertisement = new BgpAdvertisementApi(runner);
  }
}
