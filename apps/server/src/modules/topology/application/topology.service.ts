import { prisma } from '../../../database/index.js';

interface TopologyNode {
  id: string;
  label: string;
  host: string | null;
  status: string;
  type: 'routeros' | 'neighbor';
  lastSeenAt: Date | null;
}

function text(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = raw[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return '';
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export class TopologyService {
  public async getTopology() {
    const devices = await prisma.device.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        host: true,
        status: true,
        lastSeenAt: true,
      },
    });

    const latestSnapshots = await Promise.all(
      devices.map(async (device) => {
        const snapshot = await prisma.inventorySnapshot.findFirst({
          where: { deviceId: device.id, status: { in: ['completed', 'partial'] } },
          orderBy: { collectedAt: 'desc' },
          include: {
            sections: {
              where: {
                path: { in: ['/ip/neighbor/print', '/system/identity/print'] },
              },
              include: { items: true },
            },
          },
        });
        return { device, snapshot };
      }),
    );

    const nodes: TopologyNode[] = devices.map((device) => ({
      id: device.id,
      label: device.name,
      host: device.host,
      status: device.status,
      type: 'routeros',
      lastSeenAt: device.lastSeenAt,
    }));
    const managedByIdentity = new Map<string, string>();
    const managedByAddress = new Map<string, string>();

    for (const { device, snapshot } of latestSnapshots) {
      managedByIdentity.set(normalized(device.name), device.id);
      managedByAddress.set(normalized(device.host), device.id);
      const identitySection = snapshot?.sections.find(
        (section) => section.path === '/system/identity/print',
      );
      const raw = identitySection?.items[0]?.raw as Record<string, unknown> | undefined;
      const identity = raw ? text(raw, 'name', 'identity') : '';
      if (identity) managedByIdentity.set(normalized(identity), device.id);
    }

    const links = new Map<
      string,
      {
        id: string;
        source: string;
        target: string;
        label: string;
        managed: boolean;
        metadata: Record<string, unknown>;
      }
    >();

    for (const item of latestSnapshots) {
      const neighborSection = item.snapshot?.sections.find(
        (section) => section.path === '/ip/neighbor/print',
      );
      if (!neighborSection) continue;

      for (const neighbor of neighborSection.items) {
        const raw = neighbor.raw as Record<string, unknown>;
        const identity = text(raw, 'identity', 'system-description') || 'unknown-neighbor';
        const address = text(raw, 'address', 'address6', 'mac-address');
        const macAddress = text(raw, 'mac-address');
        const localInterface = text(raw, 'interface') || 'neighbor';
        const managedTarget =
          managedByIdentity.get(normalized(identity)) ??
          (address ? managedByAddress.get(normalized(address)) : undefined);
        const neighborId =
          managedTarget ??
          `neighbor:${normalized(macAddress || identity)}:${normalized(address || localInterface)}`;

        if (neighborId === item.device.id) continue;
        if (!nodes.some((node) => node.id === neighborId)) {
          nodes.push({
            id: neighborId,
            label: identity,
            host: address || macAddress || null,
            status: 'discovered',
            type: 'neighbor',
            lastSeenAt: null,
          });
        }

        const key = [item.device.id, neighborId].sort().join('--');
        const existing = links.get(key);
        if (!existing) {
          links.set(key, {
            id: key,
            source: item.device.id,
            target: neighborId,
            label: localInterface,
            managed: Boolean(managedTarget),
            metadata: raw,
          });
        } else if (!existing.label.split(' ↔ ').includes(localInterface)) {
          links.set(key, { ...existing, label: `${existing.label} ↔ ${localInterface}` });
        }
      }
    }

    const resolvedLinks = [...links.values()];
    const connectedManagedIds = new Set<string>();
    for (const link of resolvedLinks) {
      if (!link.managed) continue;
      connectedManagedIds.add(link.source);
      connectedManagedIds.add(link.target);
    }

    return {
      nodes,
      links: resolvedLinks,
      summary: {
        nodes: nodes.length,
        links: links.size,
        devices: devices.length,
        managedLinks: resolvedLinks.filter((link) => link.managed).length,
        connectedDevices: connectedManagedIds.size,
        isolatedDevices: Math.max(0, devices.length - connectedManagedIds.size),
      },
    };
  }
}

export const topologyService = new TopologyService();
