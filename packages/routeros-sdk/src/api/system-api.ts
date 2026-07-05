import type { CommandRunner } from '../core/command-runner.js';
import type { RouterOsIdentity, RouterOsResource, RouterOsRouterboard } from '../models/system.js';

export class SystemApi {
  public constructor(private readonly runner: CommandRunner) {}

  public identity(): Promise<RouterOsIdentity> {
    return this.runner.printOne('/system/identity/print') as Promise<RouterOsIdentity>;
  }

  public resource(): Promise<RouterOsResource> {
    return this.runner.printOne('/system/resource/print') as Promise<RouterOsResource>;
  }

  public routerboard(): Promise<RouterOsRouterboard> {
    return this.runner.printOne('/system/routerboard/print') as Promise<RouterOsRouterboard>;
  }

  public async setIdentity(name: string): Promise<void> {
    await this.runner.set('/system/identity/set', { name });
  }
}
