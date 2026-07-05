export interface RouterOsNeighbor {
  id?: string;
  interface?: string;
  address?: string;
  macAddress?: string;
  identity?: string;
  platform?: string;
  version?: string;
  unpack?: string;
  age?: string;
  discoveredBy?: string;
}

export interface RouterOsDiscoveryDevice {
  key: string;
  identity?: string;
  address?: string;
  macAddress?: string;
  interface?: string;
  platform?: string;
  version?: string;
  discoveredBy?: string;
  firstSeenAt: string;
  lastSeenAt: string;
  raw: Record<string, string | undefined>;
}

export interface RouterOsDiscoverySnapshot {
  collectedAt: string;
  devices: RouterOsDiscoveryDevice[];
}

export interface RouterOsDiscoveryDiff {
  added: RouterOsDiscoveryDevice[];
  removed: RouterOsDiscoveryDevice[];
  changed: Array<{
    before: RouterOsDiscoveryDevice;
    after: RouterOsDiscoveryDevice;
  }>;
}
