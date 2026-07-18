import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../database/index.js';
import { normalizeConnectionStatus } from '../../device/infrastructure/device.repository.js';
import {
  resolveTopology,
  TOPOLOGY_INVENTORY_PATHS,
  type ResolvedTopology,
  type TopologyDeviceInput,
  type TopologyNode,
} from '../domain/topology-resolver.js';

export interface TopologyLayoutPosition {
  nodeId: string;
  x: number;
  y: number;
}

function scopeKey(deviceId?: string): string {
  return deviceId ? `device:${deviceId}` : 'all';
}

function scopedGraph(graph: ResolvedTopology, deviceId?: string): ResolvedTopology {
  if (!deviceId) return graph;
  const links = graph.links.filter(
    (link) =>
      link.source === deviceId ||
      link.target === deviceId ||
      link.evidence.some((evidence) => evidence.deviceId === deviceId),
  );
  const visibleIds = new Set<string>([deviceId]);
  for (const link of links) {
    visibleIds.add(link.source);
    visibleIds.add(link.target);
  }
  const nodes = graph.nodes.filter((node) => visibleIds.has(node.id));
  const connectedManagedIds = new Set<string>();
  for (const link of links) {
    if (!link.managed || link.confidence === 'unresolved') continue;
    connectedManagedIds.add(link.source);
    connectedManagedIds.add(link.target);
  }
  const count = (confidence: (typeof links)[number]['confidence']) =>
    links.filter((link) => link.confidence === confidence).length;
  return {
    nodes,
    links,
    summary: {
      nodes: nodes.length,
      links: links.length,
      devices: nodes.filter((node) => node.managed).length,
      managedLinks: links.filter((link) => link.managed).length,
      connectedDevices: connectedManagedIds.size,
      isolatedDevices: connectedManagedIds.has(deviceId) ? 0 : 1,
      confirmedLinks: count('confirmed'),
      inferredLinks: count('inferred'),
      unresolvedLinks: count('unresolved'),
      manualLinks: count('manual'),
      evidenceSources: links.reduce((total, link) => total + link.evidence.length, 0),
    },
  };
}

function graphHash(graph: ResolvedTopology): string {
  const stable = {
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      host: node.host,
      status: node.status,
      type: node.type,
      managed: node.managed,
    })),
    links: graph.links.map((link) => ({
      id: link.id,
      confidence: link.confidence,
      score: link.confidenceScore,
      type: link.type,
      evidence: link.evidence.map((item) => [item.source, item.deviceId, item.localInterface]),
    })),
  };
  return createHash('sha256').update(JSON.stringify(stable)).digest('hex');
}

export class TopologyService {
  public async getTopology(deviceId?: string) {
    const devices = await this.loadDevices();
    if (deviceId && !devices.some((device) => device.id === deviceId)) {
      throw new Error('Device not found');
    }
    const manualLinks = await prisma.topologyManualLink.findMany({ orderBy: { createdAt: 'asc' } });
    const fullGraph = resolveTopology(devices, manualLinks);
    const graph = scopedGraph(fullGraph, deviceId);
    const layoutScope = scopeKey(deviceId);
    const layoutRows = await prisma.topologyNodeLayout.findMany({
      where: { scope: layoutScope },
      orderBy: { nodeId: 'asc' },
    });

    return {
      ...graph,
      scope: layoutScope,
      generatedAt: new Date().toISOString(),
      managedDevices: fullGraph.nodes.filter((node) => node.managed),
      layout: Object.fromEntries(
        layoutRows.map((position) => [position.nodeId, { x: position.x, y: position.y }]),
      ),
    };
  }

  public async capture(deviceId?: string) {
    const topology = await this.getTopology(deviceId);
    const graph: ResolvedTopology = {
      nodes: topology.nodes,
      links: topology.links,
      summary: topology.summary,
    };
    const hash = graphHash(graph);
    const scope = scopeKey(deviceId);
    const previous = await prisma.topologySnapshot.findFirst({
      where: { scope },
      orderBy: { collectedAt: 'desc' },
      select: { graphHash: true },
    });
    if (previous?.graphHash === hash) return { topology, captured: false, graphHash: hash };

    const snapshot = await prisma.topologySnapshot.create({
      data: {
        scope,
        graphHash: hash,
        nodes: topology.nodes as unknown as Prisma.InputJsonValue,
        links: topology.links as unknown as Prisma.InputJsonValue,
        summary: topology.summary as unknown as Prisma.InputJsonValue,
      },
    });
    const stale = await prisma.topologySnapshot.findMany({
      where: { scope },
      orderBy: { collectedAt: 'desc' },
      skip: 200,
      select: { id: true },
    });
    if (stale.length > 0) {
      await prisma.topologySnapshot.deleteMany({
        where: { id: { in: stale.map((item) => item.id) } },
      });
    }
    return { topology, captured: true, graphHash: hash, snapshotId: snapshot.id };
  }

  public async history(deviceId?: string, limit = 30) {
    return prisma.topologySnapshot.findMany({
      where: { scope: scopeKey(deviceId) },
      orderBy: { collectedAt: 'desc' },
      take: Math.min(200, Math.max(1, limit)),
      select: {
        id: true,
        graphHash: true,
        summary: true,
        collectedAt: true,
      },
    });
  }

  public async saveLayout(deviceId: string | undefined, positions: TopologyLayoutPosition[]) {
    const scope = scopeKey(deviceId);
    await prisma.$transaction(
      positions.map((position) =>
        prisma.topologyNodeLayout.upsert({
          where: { scope_nodeId: { scope, nodeId: position.nodeId } },
          create: { scope, nodeId: position.nodeId, x: position.x, y: position.y },
          update: { x: position.x, y: position.y },
        }),
      ),
    );
    return { scope, saved: positions.length };
  }

  public async createManualLink(input: {
    sourceNodeId: string;
    targetNodeId: string;
    label?: string;
  }) {
    if (input.sourceNodeId === input.targetNodeId) {
      throw new Error('A topology link requires two different nodes');
    }
    const [sourceNodeId, targetNodeId] = [input.sourceNodeId, input.targetNodeId].sort();
    return prisma.topologyManualLink.upsert({
      where: { sourceNodeId_targetNodeId: { sourceNodeId, targetNodeId } },
      create: { sourceNodeId, targetNodeId, label: input.label, locked: true },
      update: { label: input.label, locked: true },
    });
  }

  public async deleteManualLink(id: string) {
    await prisma.topologyManualLink.delete({ where: { id } });
    return { deleted: true, id };
  }

  private async loadDevices(): Promise<TopologyDeviceInput[]> {
    const devices = await prisma.device.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, host: true, status: true, lastSeenAt: true },
    });
    return Promise.all(
      devices.map(async (device) => {
        const [snapshot, recentTraffic] = await Promise.all([
          prisma.inventorySnapshot.findFirst({
            where: { deviceId: device.id, status: { in: ['completed', 'partial'] } },
            orderBy: { collectedAt: 'desc' },
            include: {
              sections: {
                where: { path: { in: [...TOPOLOGY_INVENTORY_PATHS] } },
                include: { items: true },
              },
            },
          }),
          prisma.trafficSample.findMany({
            where: { deviceId: device.id, running: true },
            orderBy: { collectedAt: 'desc' },
            take: 200,
            select: { interfaceName: true, rxBps: true, txBps: true },
          }),
        ]);
        const latestByInterface = new Map<string, (typeof recentTraffic)[number]>();
        for (const sample of recentTraffic) {
          if (!latestByInterface.has(sample.interfaceName)) {
            latestByInterface.set(sample.interfaceName, sample);
          }
        }
        const primaryTraffic = [...latestByInterface.values()].sort(
          (left, right) => right.rxBps + right.txBps - (left.rxBps + left.txBps),
        )[0];
        return {
          ...device,
          status: normalizeConnectionStatus(device.status),
          traffic: primaryTraffic,
          snapshot: snapshot
            ? {
                collectedAt: snapshot.collectedAt,
                sections: snapshot.sections.map((section) => ({
                  path: section.path,
                  rows: section.items.map((item) => item.raw as Record<string, string>),
                })),
              }
            : null,
        };
      }),
    );
  }
}

export const topologyService = new TopologyService();

export type { TopologyNode };
