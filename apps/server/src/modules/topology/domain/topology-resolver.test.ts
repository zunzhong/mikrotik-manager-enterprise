import { describe, expect, it } from 'vitest';
import { resolveTopology, type TopologyDeviceInput } from './topology-resolver.js';

const collectedAt = new Date('2026-07-18T08:00:00.000Z');
const now = new Date('2026-07-18T08:10:00.000Z');

function device(
  id: string,
  name: string,
  host: string,
  sections: Array<{ path: string; rows: Array<Record<string, string>> }>,
): TopologyDeviceInput {
  return {
    id,
    name,
    host,
    status: 'online',
    lastSeenAt: collectedAt,
    snapshot: { collectedAt, sections },
  };
}

describe('topology multi-source resolver', () => {
  it('resolves reciprocal RouterOS neighbors as one confirmed managed link', () => {
    const graph = resolveTopology(
      [
        device('r1', 'Router 1', '10.0.0.1', [
          { path: '/system/identity/print', rows: [{ name: 'CORE-R1' }] },
          {
            path: '/ip/neighbor/print',
            rows: [
              {
                identity: 'CORE-R2',
                address: '10.0.0.2',
                'mac-address': 'AA:00:00:00:00:02',
                interface: 'ether2',
              },
            ],
          },
        ]),
        device('r2', 'Router 2', '10.0.0.2', [
          { path: '/system/identity/print', rows: [{ name: 'CORE-R2' }] },
          {
            path: '/interface/print',
            rows: [{ name: 'ether1', 'mac-address': 'AA:00:00:00:00:02' }],
          },
          {
            path: '/ip/neighbor/print',
            rows: [{ identity: 'CORE-R1', address: '10.0.0.1', interface: 'ether1' }],
          },
        ]),
      ],
      [],
      now,
    );

    expect(graph.links).toHaveLength(1);
    expect(graph.links[0]).toMatchObject({
      source: 'r1',
      target: 'r2',
      managed: true,
      confidence: 'confirmed',
      type: 'wired',
    });
    expect(graph.links[0]?.evidence).toHaveLength(2);
    expect(graph.summary.connectedDevices).toBe(2);
  });

  it('combines bridge FDB, ARP and DHCP evidence without creating duplicate client nodes', () => {
    const graph = resolveTopology(
      [
        device('r1', 'Router 1', '10.0.0.1', [
          {
            path: '/interface/bridge/host/print',
            rows: [{ 'mac-address': 'AA:BB:CC:DD:EE:FF', 'on-interface': 'ether3' }],
          },
          {
            path: '/ip/arp/print',
            rows: [
              { address: '10.0.0.50', 'mac-address': 'AA-BB-CC-DD-EE-FF', interface: 'bridge' },
            ],
          },
          {
            path: '/ip/dhcp-server/lease/print',
            rows: [
              {
                'active-address': '10.0.0.50',
                'active-mac-address': 'aa:bb:cc:dd:ee:ff',
                'host-name': 'CAM-FRONT',
              },
            ],
          },
        ]),
      ],
      [],
      now,
    );

    expect(graph.nodes.filter((node) => !node.managed)).toHaveLength(1);
    expect(graph.nodes.find((node) => !node.managed)).toMatchObject({
      label: 'CAM-FRONT',
      type: 'camera',
      ipAddress: '10.0.0.50',
      macAddress: 'AA:BB:CC:DD:EE:FF',
    });
    expect(graph.links[0]).toMatchObject({ confidence: 'inferred', type: 'wired' });
    expect(graph.links[0]?.evidence.map((item) => item.source)).toEqual([
      'bridge-host',
      'arp',
      'dhcp',
    ]);
  });

  it('marks an active WiFi registration as a confirmed wireless client link', () => {
    const graph = resolveTopology(
      [
        device('ap1', 'Access Point', '10.0.0.5', [
          {
            path: '/interface/wifi/registration-table/print',
            rows: [
              {
                'mac-address': '10:20:30:40:50:60',
                'last-ip': '10.0.0.60',
                comment: 'Galaxy Phone',
                interface: 'wifi1',
              },
            ],
          },
        ]),
      ],
      [],
      now,
    );

    expect(graph.links[0]).toMatchObject({
      confidence: 'confirmed',
      confidenceScore: 96,
      type: 'wireless',
      label: 'wifi1',
    });
    expect(graph.nodes.find((node) => !node.managed)?.type).toBe('phone');
  });

  it('keeps ARP-only observations unresolved instead of claiming a physical link', () => {
    const graph = resolveTopology(
      [
        device('r1', 'Router 1', '10.0.0.1', [
          {
            path: '/ip/arp/print',
            rows: [{ address: '10.0.0.99', 'mac-address': '00:11:22:33:44:55' }],
          },
        ]),
      ],
      [],
      now,
    );

    expect(graph.links[0]).toMatchObject({ confidence: 'unresolved', confidenceScore: 30 });
    expect(graph.summary.connectedDevices).toBe(0);
  });

  it('keeps ambiguous duplicate identities unresolved instead of linking the wrong managed device', () => {
    const graph = resolveTopology(
      [
        device('r1', 'Branch', '10.0.0.1', [
          { path: '/system/identity/print', rows: [{ name: 'DUPLICATE' }] },
        ]),
        device('r2', 'Branch 2', '10.0.0.2', [
          { path: '/system/identity/print', rows: [{ name: 'DUPLICATE' }] },
        ]),
        device('r3', 'Observer', '10.0.0.3', [
          {
            path: '/ip/neighbor/print',
            rows: [{ identity: 'DUPLICATE', interface: 'ether4' }],
          },
        ]),
      ],
      [],
      now,
    );

    const link = graph.links.find((item) => item.source === 'r3' || item.target === 'r3');
    expect(link?.managed).toBe(false);
    expect(graph.nodes.filter((node) => node.identity === 'DUPLICATE')).toHaveLength(3);
  });

  it('preserves a manual link label and keeps it separate from inferred evidence', () => {
    const graph = resolveTopology(
      [],
      [
        {
          id: 'manual-1',
          sourceNodeId: 'node-a',
          targetNodeId: 'node-b',
          label: 'WAN dự phòng',
          updatedAt: collectedAt,
        },
      ],
      now,
    );

    expect(graph.links[0]).toMatchObject({
      label: 'WAN dự phòng',
      confidence: 'manual',
      confidenceScore: 100,
    });
  });

  it('does not merge two different MAC addresses that share one DHCP hostname', () => {
    const graph = resolveTopology(
      [
        device('r1', 'Router 1', '10.0.0.1', [
          {
            path: '/ip/dhcp-server/lease/print',
            rows: [
              { 'mac-address': '00:00:00:00:00:01', address: '10.0.0.21', 'host-name': 'phone' },
              { 'mac-address': '00:00:00:00:00:02', address: '10.0.0.22', 'host-name': 'phone' },
            ],
          },
        ]),
      ],
      [],
      now,
    );

    expect(graph.nodes.filter((node) => !node.managed)).toHaveLength(2);
    expect(
      new Set(graph.nodes.filter((node) => !node.managed).map((node) => node.macAddress)),
    ).toEqual(new Set(['00:00:00:00:00:01', '00:00:00:00:00:02']));
  });
});
