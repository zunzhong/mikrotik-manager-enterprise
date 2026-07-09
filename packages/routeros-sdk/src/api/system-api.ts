import type { CommandRunner } from '../core/command-runner.js';
import { mapIdentity, mapResource, mapRouterboard } from '../mappers/system.mapper.js';
import type { RouterOsIdentity, RouterOsResource, RouterOsRouterboard } from '../models/system.js';

export class SystemApi {
  public constructor(private readonly runner: CommandRunner) {}
  public async identity(): Promise<RouterOsIdentity> {
    return mapIdentity(await this.runner.printOne('/system/identity/print'));
  }
  public async resource(): Promise<RouterOsResource> {
    return mapResource(await this.runner.printOne('/system/resource/print'));
  }
  public async routerboard(): Promise<RouterOsRouterboard> {
    return mapRouterboard(await this.runner.printOne('/system/routerboard/print'));
  }
  public async setIdentity(name: string): Promise<void> {
    await this.runner.set('/system/identity/set', { name });
  }
}
