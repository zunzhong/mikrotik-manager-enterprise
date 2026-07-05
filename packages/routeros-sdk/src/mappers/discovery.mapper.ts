import type { RouterOsRecord } from '../core/routeros-record.js';
import type { RouterOsDiscoveryDevice, RouterOsNeighbor } from '../models/discovery.js';
import { stringField } from './mapper-utils.js';

export function mapNeighbor(record: RouterOsRecord): RouterOsNeighbor {
  return {
    id: stringField(record, 'id') ?? stringField(record, '.id'),
    interface: stringField(record, 'interface'),
    address: stringField(record, 'address'),
    macAddress: stringField(record, 'macAddress'),
    identity: stringField(record, 'identity'),
    platform: stringField(record, 'platform'),
    version: stringField(record, 'version'),
    unpack: stringField(record, 'unpack'),
    age: stringField(record, 'age'),
    discoveredBy: stringField(record, 'discoveredBy'),
  };
}

export function fingerprintNeighbor(neighbor: RouterOsNeighbor): string {
  return [
    neighbor.macAddress,
    neighbor.address,
    neighbor.identity,
    neighbor.interface,
  ].filter(Boolean).join('|');
}

export function mapNeighborToDiscoveryDevice(neighbor: RouterOsNeighbor, collectedAt = new Date().toISOString()): RouterOsDiscoveryDevice {
  return {
    key: fingerprintNeighbor(neighbor),
    identity: neighbor.identity,
    address: neighbor.address,
    macAddress: neighbor.macAddress,
    interface: neighbor.interface,
    platform: neighbor.platform,
    version: neighbor.version,
    discoveredBy: neighbor.discoveredBy,
    firstSeenAt: collectedAt,
    lastSeenAt: collectedAt,
    raw: {
      id: neighbor.id,
      interface: neighbor.interface,
      address: neighbor.address,
      macAddress: neighbor.macAddress,
      identity: neighbor.identity,
      platform: neighbor.platform,
      version: neighbor.version,
      unpack: neighbor.unpack,
      age: neighbor.age,
      discoveredBy: neighbor.discoveredBy,
    },
  };
}
