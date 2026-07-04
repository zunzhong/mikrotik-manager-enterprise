import { prisma } from '../../../database/index.js';

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
          where: { deviceId: device.id },
          orderBy: { collectedAt: 'desc' },
          include: {
            sections: {
              where: {
                path: '/ip/neighbor/print',
              },
              include: {
                items: true,
              },
            },
          },
        });

        return { device, snapshot };
      }),
    );

    const nodes = devices.map((device) => ({
      id: device.id,
      label: device.name,
      host: device.host,
      status: device.status,
      type: 'routeros',
      lastSeenAt: device.lastSeenAt,
    }));

    const links = [];

    for (const item of latestSnapshots) {
      const neighborSection = item.snapshot?.sections[0];

      if (!neighborSection) {
        continue;
      }

      for (const neighbor of neighborSection.items) {
        const raw = neighbor.raw as Record<string, unknown>;
        const identity = String(raw.identity ?? raw['system-description'] ?? raw.address ?? 'unknown-neighbor');
        const address = String(raw.address ?? raw['interface'] ?? identity);
        const neighborId = `neighbor:${identity}:${address}`;

        if (!nodes.some((node) => node.id === neighborId)) {
          nodes.push({
            id: neighborId,
            label: identity,
            host: address,
            status: 'discovered',
            type: 'neighbor',
            lastSeenAt: null,
          });
        }

        links.push({
          id: `${item.device.id}-${neighborId}`,
          source: item.device.id,
          target: neighborId,
          label: String(raw.interface ?? 'neighbor'),
          metadata: raw,
        });
      }
    }

    return {
      nodes,
      links,
      summary: {
        nodes: nodes.length,
        links: links.length,
        devices: devices.length,
      },
    };
  }
}

export const topologyService = new TopologyService();
