import type { CommandRunner } from '../core/command-runner.js';
import type { RouterOsTunnelInterface } from '../models/vpn.js';

class TunnelSubApi {
  public constructor(
    private readonly runner: CommandRunner,
    private readonly path: string,
  ) {}

  public list(): Promise<RouterOsTunnelInterface[]> {
    return this.runner.print(`${this.path}/print`) as Promise<RouterOsTunnelInterface[]>;
  }

  public async enable(id: string): Promise<void> {
    await this.runner.run(`${this.path}/enable`, { attributes: { numbers: id } });
  }

  public async disable(id: string): Promise<void> {
    await this.runner.run(`${this.path}/disable`, { attributes: { numbers: id } });
  }

  public async remove(id: string): Promise<void> {
    await this.runner.remove(`${this.path}/remove`, id);
  }
}

export class TunnelApi {
  public readonly gre: TunnelSubApi;
  public readonly ipip: TunnelSubApi;
  public readonly eoip: TunnelSubApi;
  public readonly l2tpClient: TunnelSubApi;
  public readonly sstpClient: TunnelSubApi;

  public constructor(runner: CommandRunner) {
    this.gre = new TunnelSubApi(runner, '/interface/gre');
    this.ipip = new TunnelSubApi(runner, '/interface/ipip');
    this.eoip = new TunnelSubApi(runner, '/interface/eoip');
    this.l2tpClient = new TunnelSubApi(runner, '/interface/l2tp-client');
    this.sstpClient = new TunnelSubApi(runner, '/interface/sstp-client');
  }
}
