import type { CommandRunner } from '../core/command-runner.js';
import { mapNeighbor, mapNeighborToDiscoveryDevice } from '../mappers/discovery.mapper.js';
import { mapList } from '../mappers/mapper-utils.js';
import type { RouterOsDiscoverySnapshot, RouterOsNeighbor } from '../models/discovery.js';

export class DiscoveryApi {
  public constructor(private readonly runner: CommandRunner) {}

  public async neighbors(): Promise<RouterOsNeighbor[]> {
    return mapList(await this.runner.print('/ip/neighbor/print'), mapNeighbor);
  }

  public async snapshot(): Promise<RouterOsDiscoverySnapshot> {
    const collectedAt = new Date().toISOString();
    const neighbors = await this.neighbors();

    return {
      collectedAt,
      devices: neighbors.map((neighbor) => mapNeighborToDiscoveryDevice(neighbor, collectedAt)),
    };
  }
}
