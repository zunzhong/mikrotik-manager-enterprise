import type {
  RouterOsDiscoveryDevice,
  RouterOsDiscoveryDiff,
  RouterOsDiscoverySnapshot,
} from '../models/discovery.js';

function deviceChanged(a: RouterOsDiscoveryDevice, b: RouterOsDiscoveryDevice): boolean {
  return (
    a.identity !== b.identity ||
    a.address !== b.address ||
    a.macAddress !== b.macAddress ||
    a.interface !== b.interface ||
    a.platform !== b.platform ||
    a.version !== b.version ||
    a.discoveredBy !== b.discoveredBy
  );
}

export function diffDiscoverySnapshots(
  before: RouterOsDiscoverySnapshot,
  after: RouterOsDiscoverySnapshot,
): RouterOsDiscoveryDiff {
  const beforeMap = new Map(before.devices.map((device) => [device.key, device]));
  const afterMap = new Map(after.devices.map((device) => [device.key, device]));

  const added: RouterOsDiscoveryDevice[] = [];
  const removed: RouterOsDiscoveryDevice[] = [];
  const changed: RouterOsDiscoveryDiff['changed'] = [];

  for (const afterDevice of after.devices) {
    const beforeDevice = beforeMap.get(afterDevice.key);
    if (!beforeDevice) {
      added.push(afterDevice);
    } else if (deviceChanged(beforeDevice, afterDevice)) {
      changed.push({ before: beforeDevice, after: afterDevice });
    }
  }

  for (const beforeDevice of before.devices) {
    if (!afterMap.has(beforeDevice.key)) {
      removed.push(beforeDevice);
    }
  }

  return { added, removed, changed };
}
