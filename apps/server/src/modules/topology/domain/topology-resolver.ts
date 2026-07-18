export const TOPOLOGY_INVENTORY_PATHS = [
  '/system/identity/print',
  '/system/resource/print',
  '/system/routerboard/print',
  '/system/health/print',
  '/interface/print',
  '/interface/ethernet/print',
  '/ip/address/print',
  '/ip/neighbor/print',
  '/interface/bridge/host/print',
  '/interface/wifi/registration-table/print',
  '/interface/wifiwave2/registration-table/print',
  '/interface/wireless/registration-table/print',
  '/caps-man/registration-table/print',
  '/routing/ospf/neighbor/print',
  '/ip/arp/print',
  '/ip/dhcp-server/lease/print',
] as const;

export type TopologyConfidence = 'confirmed' | 'inferred' | 'unresolved' | 'manual';
export type TopologyLinkType = 'wired' | 'wireless' | 'routing' | 'manual' | 'unknown';
export type TopologyNodeType =
  | 'router'
  | 'switch'
  | 'access-point'
  | 'camera'
  | 'computer'
  | 'phone'
  | 'client'
  | 'neighbor'
  | 'unknown';

export interface TopologyEvidence {
  source: 'neighbor' | 'bridge-host' | 'wifi' | 'ospf' | 'arp' | 'dhcp' | 'manual';
  path: string;
  deviceId?: string;
  observedAt: string;
  weight: number;
  localInterface?: string;
  remoteInterface?: string;
  details: Record<string, string>;
}

export interface TopologyNodeMetrics {
  cpuLoadPercent?: number;
  memoryUsagePercent?: number;
  temperatureCelsius?: number;
  uptime?: string;
  rxBps?: number;
  txBps?: number;
  trafficInterface?: string;
}

export interface TopologyNode {
  id: string;
  label: string;
  host: string | null;
  status: string;
  type: TopologyNodeType;
  managed: boolean;
  deviceId?: string;
  identity?: string;
  ipAddress?: string;
  macAddress?: string;
  model?: string;
  platform?: string;
  version?: string;
  serialNumber?: string;
  lastSeenAt: string | null;
  sourceDeviceIds: string[];
  metrics?: TopologyNodeMetrics;
}

export interface TopologyLink {
  id: string;
  source: string;
  target: string;
  label: string;
  managed: boolean;
  type: TopologyLinkType;
  confidence: TopologyConfidence;
  confidenceScore: number;
  status: 'active' | 'stale' | 'manual';
  lastObservedAt: string;
  evidence: TopologyEvidence[];
}

export interface TopologySectionInput {
  path: string;
  rows: Array<Record<string, string>>;
}

export interface TopologyDeviceInput {
  id: string;
  name: string;
  host: string;
  status: string;
  lastSeenAt?: Date | string | null;
  traffic?: { interfaceName: string; rxBps: number; txBps: number };
  snapshot?: {
    collectedAt: Date | string;
    sections: TopologySectionInput[];
  } | null;
}

export interface TopologyManualLinkInput {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string | null;
  updatedAt: Date | string;
}

export interface ResolvedTopology {
  nodes: TopologyNode[];
  links: TopologyLink[];
  summary: {
    nodes: number;
    links: number;
    devices: number;
    managedLinks: number;
    connectedDevices: number;
    isolatedDevices: number;
    confirmedLinks: number;
    inferredLinks: number;
    unresolvedLinks: number;
    manualLinks: number;
    evidenceSources: number;
  };
}

interface NodeBuilder extends TopologyNode {
  aliases: Set<string>;
  sourceIds: Set<string>;
}

interface LinkBuilder {
  id: string;
  source: string;
  target: string;
  types: Set<TopologyLinkType>;
  interfaces: Set<string>;
  evidence: TopologyEvidence[];
}

function value(row: Record<string, string> | undefined, ...keys: string[]): string {
  if (!row) return '';
  for (const key of keys) {
    const candidate = row[key];
    if (candidate !== undefined && candidate !== null && String(candidate).trim()) {
      return String(candidate).trim();
    }
  }
  return '';
}

function normalized(valueToNormalize: string): string {
  return valueToNormalize.trim().toLocaleLowerCase();
}

function normalizedIp(input: string): string {
  const trimmed = input.trim().replace(/^https?:\/\//i, '');
  const withoutCidr = trimmed.split('/')[0] ?? '';
  return normalized(withoutCidr.replace(/^\[|\]$/g, ''));
}

function normalizedMac(input: string): string {
  const compact = input.replace(/[^a-fA-F0-9]/g, '').toLocaleLowerCase();
  if (compact.length !== 12) return normalized(input);
  return compact.match(/.{1,2}/g)?.join(':') ?? compact;
}

function simpleHash(input: string): string {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function externalId(kind: 'mac' | 'ip' | 'name', input: string): string {
  const normalizedInput = normalized(input);
  const readable = normalizedInput
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
  return `external:${kind}:${readable || 'node'}-${simpleHash(normalizedInput)}`;
}

function dateString(input: Date | string | null | undefined): string | null {
  if (!input) return null;
  const date = input instanceof Date ? input : new Date(input);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function numberValue(input: string): number | undefined {
  if (!input) return undefined;
  const parsed = Number.parseFloat(input.replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function inferType(...hints: string[]): TopologyNodeType {
  const hint = normalized(hints.filter(Boolean).join(' '));
  if (/camera|\bcam\b|cctv|hikvision|dahua|reolink|ipc/.test(hint)) return 'camera';
  if (/iphone|android|phone|mobile|galaxy|xiaomi|redmi|oppo|vivo/.test(hint)) return 'phone';
  if (/access.?point|\bap\b|caps?man|audience|wap|wifi|wireless/.test(hint)) {
    return 'access-point';
  }
  if (/switch|crs\d|css\d/.test(hint)) return 'switch';
  if (/router|routeros|mikrotik|rb\d|ccr\d|chr\b|hex\b|hap\b/.test(hint)) return 'router';
  if (/computer|desktop|laptop|windows|macbook|linux|server|nas/.test(hint)) return 'computer';
  if (/client|station/.test(hint)) return 'client';
  return 'neighbor';
}

function rowsFor(device: TopologyDeviceInput, path: string): Array<Record<string, string>> {
  return device.snapshot?.sections.find((section) => section.path === path)?.rows ?? [];
}

function memoryUsage(resource: Record<string, string> | undefined): number | undefined {
  const total = numberValue(value(resource, 'total-memory'));
  const free = numberValue(value(resource, 'free-memory'));
  if (total === undefined || free === undefined || total <= 0) return undefined;
  return Math.round((1 - free / total) * 1000) / 10;
}

function temperature(rows: Array<Record<string, string>>): number | undefined {
  for (const row of rows) {
    const direct = numberValue(value(row, 'temperature', 'cpu-temperature', 'board-temperature'));
    if (direct !== undefined) return direct;
    if (/temp/i.test(value(row, 'name'))) {
      const sensor = numberValue(value(row, 'value'));
      if (sensor !== undefined) return sensor;
    }
  }
  return undefined;
}

function confidenceFor(evidence: TopologyEvidence[]): {
  confidence: TopologyConfidence;
  score: number;
} {
  if (evidence.some((item) => item.source === 'manual')) {
    return { confidence: 'manual', score: 100 };
  }
  const remaining = evidence.reduce((product, item) => product * (1 - item.weight / 100), 1);
  const score = Math.min(100, Math.round((1 - remaining) * 100));
  if (score >= 90) return { confidence: 'confirmed', score };
  if (score >= 65) return { confidence: 'inferred', score };
  return { confidence: 'unresolved', score };
}

function bestType(types: Set<TopologyLinkType>): TopologyLinkType {
  for (const type of ['manual', 'wireless', 'wired', 'routing', 'unknown'] as const) {
    if (types.has(type)) return type;
  }
  return 'unknown';
}

export function resolveTopology(
  devices: TopologyDeviceInput[],
  manualLinks: TopologyManualLinkInput[] = [],
  now = new Date(),
): ResolvedTopology {
  const nodes = new Map<string, NodeBuilder>();
  const links = new Map<string, LinkBuilder>();
  const managedAliases = new Map<string, Set<string>>();
  const externalAliases = new Map<string, Set<string>>();

  function aliasKey(kind: 'name' | 'ip' | 'mac', input: string): string {
    const normalizedValue =
      kind === 'ip'
        ? normalizedIp(input)
        : kind === 'mac'
          ? normalizedMac(input)
          : normalized(input);
    return `${kind}:${normalizedValue}`;
  }

  function addManagedAlias(deviceId: string, kind: 'name' | 'ip' | 'mac', input: string) {
    if (!input) return;
    const key = aliasKey(kind, input);
    const existing = managedAliases.get(key) ?? new Set<string>();
    existing.add(deviceId);
    managedAliases.set(key, existing);
  }

  function resolveManagedAlias(kind: 'name' | 'ip' | 'mac', input: string): string | undefined {
    if (!input) return undefined;
    const candidates = managedAliases.get(aliasKey(kind, input));
    return candidates?.size === 1 ? [...candidates][0] : undefined;
  }

  function resolveExternalAlias(alias: string): string | undefined {
    const candidates = externalAliases.get(alias);
    return candidates?.size === 1 ? [...candidates][0] : undefined;
  }

  function addExternalAlias(alias: string, nodeId: string) {
    const candidates = externalAliases.get(alias) ?? new Set<string>();
    candidates.add(nodeId);
    externalAliases.set(alias, candidates);
  }

  for (const device of devices) {
    const identity = rowsFor(device, '/system/identity/print')[0];
    const resource = rowsFor(device, '/system/resource/print')[0];
    const routerboard = rowsFor(device, '/system/routerboard/print')[0];
    const identityName = value(identity, 'name', 'identity') || device.name;
    const model = value(routerboard, 'model', 'board-name') || value(resource, 'board-name');
    const node: NodeBuilder = {
      id: device.id,
      label: identityName || device.name,
      host: device.host,
      status: device.status,
      type: inferType(identityName, model, value(resource, 'platform')),
      managed: true,
      deviceId: device.id,
      identity: identityName,
      ipAddress: device.host,
      model: model || undefined,
      platform: value(resource, 'platform') || undefined,
      version: value(resource, 'version') || undefined,
      serialNumber: value(routerboard, 'serial-number') || undefined,
      lastSeenAt: dateString(device.lastSeenAt),
      sourceDeviceIds: [device.id],
      sourceIds: new Set([device.id]),
      aliases: new Set(),
      metrics: {
        cpuLoadPercent: numberValue(value(resource, 'cpu-load')),
        memoryUsagePercent: memoryUsage(resource),
        temperatureCelsius: temperature(rowsFor(device, '/system/health/print')),
        uptime: value(resource, 'uptime') || undefined,
        rxBps: device.traffic?.rxBps,
        txBps: device.traffic?.txBps,
        trafficInterface: device.traffic?.interfaceName,
      },
    };
    nodes.set(device.id, node);
    addManagedAlias(device.id, 'name', device.name);
    addManagedAlias(device.id, 'name', identityName);
    addManagedAlias(device.id, 'ip', device.host);
    for (const row of rowsFor(device, '/ip/address/print')) {
      addManagedAlias(device.id, 'ip', value(row, 'address'));
    }
    for (const path of ['/interface/print', '/interface/ethernet/print']) {
      for (const row of rowsFor(device, path)) {
        addManagedAlias(device.id, 'mac', value(row, 'mac-address', 'orig-mac-address'));
      }
    }
  }

  function observationNode(input: {
    sourceDeviceId: string;
    name?: string;
    ip?: string;
    mac?: string;
    model?: string;
    platform?: string;
  }): string {
    const managedId =
      resolveManagedAlias('mac', input.mac ?? '') ??
      resolveManagedAlias('ip', input.ip ?? '') ??
      resolveManagedAlias('name', input.name ?? '');
    if (managedId) return managedId;

    const aliases = [
      input.mac ? aliasKey('mac', input.mac) : '',
      input.ip ? aliasKey('ip', input.ip) : '',
      input.name ? aliasKey('name', input.name) : '',
    ].filter(Boolean);
    const strongAliases = [
      input.mac ? aliasKey('mac', input.mac) : '',
      input.ip ? aliasKey('ip', input.ip) : '',
    ].filter(Boolean);
    let id = strongAliases.map((alias) => resolveExternalAlias(alias)).find(Boolean);
    if (!id && strongAliases.length === 0 && input.name) {
      id = resolveExternalAlias(aliasKey('name', input.name));
    }
    if (!id) {
      const basis = input.mac || input.ip || input.name || `${input.sourceDeviceId}:unknown`;
      const kind = input.mac ? 'mac' : input.ip ? 'ip' : 'name';
      id = externalId(kind, basis);
    }

    const current = nodes.get(id);
    const fallbackLabel = input.name || input.ip || input.mac || 'Unknown neighbor';
    if (!current) {
      nodes.set(id, {
        id,
        label: fallbackLabel,
        host: input.ip || input.mac || null,
        status: 'discovered',
        type: inferType(input.name ?? '', input.model ?? '', input.platform ?? ''),
        managed: false,
        identity: input.name || undefined,
        ipAddress: input.ip || undefined,
        macAddress: input.mac || undefined,
        model: input.model || undefined,
        platform: input.platform || undefined,
        lastSeenAt: null,
        sourceDeviceIds: [input.sourceDeviceId],
        sourceIds: new Set([input.sourceDeviceId]),
        aliases: new Set(aliases),
      });
    } else {
      current.sourceIds.add(input.sourceDeviceId);
      current.sourceDeviceIds = [...current.sourceIds];
      aliases.forEach((alias) => current.aliases.add(alias));
      if (
        (!current.identity ||
          current.label === current.ipAddress ||
          current.label === current.macAddress) &&
        input.name
      ) {
        current.label = input.name;
        current.identity = input.name;
      }
      if (!current.ipAddress && input.ip) current.ipAddress = input.ip;
      if (!current.macAddress && input.mac) current.macAddress = input.mac;
      if (!current.model && input.model) current.model = input.model;
      current.host = current.ipAddress || current.macAddress || current.host;
      current.type = inferType(current.label, current.model ?? '', input.platform ?? '');
    }
    aliases.forEach((alias) => addExternalAlias(alias, id));
    return id;
  }

  function addEvidence(
    sourceNodeId: string,
    targetNodeId: string,
    evidence: TopologyEvidence,
    type: TopologyLinkType,
  ) {
    if (!sourceNodeId || !targetNodeId || sourceNodeId === targetNodeId) return;
    const [source, target] = [sourceNodeId, targetNodeId].sort();
    const id = `${source}--${target}`;
    const current = links.get(id) ?? {
      id,
      source,
      target,
      types: new Set<TopologyLinkType>(),
      interfaces: new Set<string>(),
      evidence: [],
    };
    current.types.add(type);
    if (evidence.localInterface) current.interfaces.add(evidence.localInterface);
    if (evidence.remoteInterface) current.interfaces.add(evidence.remoteInterface);
    const duplicate = current.evidence.some(
      (item) =>
        item.source === evidence.source &&
        item.deviceId === evidence.deviceId &&
        item.localInterface === evidence.localInterface &&
        JSON.stringify(item.details) === JSON.stringify(evidence.details),
    );
    if (!duplicate) current.evidence.push(evidence);
    links.set(id, current);
  }

  function observe(
    device: TopologyDeviceInput,
    row: Record<string, string>,
    options: {
      source: TopologyEvidence['source'];
      path: string;
      weight: number;
      type: TopologyLinkType;
      name?: string;
      ip?: string;
      mac?: string;
      model?: string;
      platform?: string;
      localInterface?: string;
      remoteInterface?: string;
    },
  ) {
    if (!options.name && !options.ip && !options.mac) return;
    const target = observationNode({
      sourceDeviceId: device.id,
      name: options.name,
      ip: options.ip,
      mac: options.mac,
      model: options.model,
      platform: options.platform,
    });
    const observedAt = dateString(device.snapshot?.collectedAt) ?? now.toISOString();
    const targetNode = nodes.get(target);
    if (targetNode && !targetNode.managed) targetNode.lastSeenAt = observedAt;
    addEvidence(
      device.id,
      target,
      {
        source: options.source,
        path: options.path,
        deviceId: device.id,
        observedAt,
        weight: options.weight,
        localInterface: options.localInterface,
        remoteInterface: options.remoteInterface,
        details: row,
      },
      options.type,
    );
  }

  for (const device of devices) {
    for (const row of rowsFor(device, '/ip/neighbor/print')) {
      observe(device, row, {
        source: 'neighbor',
        path: '/ip/neighbor/print',
        weight: 94,
        type: /wireless|wifi|wlan/i.test(value(row, 'interface')) ? 'wireless' : 'wired',
        name: value(row, 'identity', 'system-name', 'system-description'),
        ip: value(row, 'address', 'address6'),
        mac: value(row, 'mac-address'),
        model: value(row, 'board', 'board-name'),
        platform: value(row, 'platform'),
        localInterface: value(row, 'interface'),
        remoteInterface: value(row, 'interface-name'),
      });
    }

    for (const row of rowsFor(device, '/interface/bridge/host/print')) {
      observe(device, row, {
        source: 'bridge-host',
        path: '/interface/bridge/host/print',
        weight: 75,
        type: 'wired',
        mac: value(row, 'mac-address'),
        localInterface: value(row, 'on-interface', 'interface', 'bridge'),
      });
    }

    for (const path of [
      '/interface/wifi/registration-table/print',
      '/interface/wifiwave2/registration-table/print',
      '/interface/wireless/registration-table/print',
      '/caps-man/registration-table/print',
    ]) {
      for (const row of rowsFor(device, path)) {
        observe(device, row, {
          source: 'wifi',
          path,
          weight: 96,
          type: 'wireless',
          name: value(row, 'comment', 'host-name', 'ssid'),
          ip: value(row, 'last-ip', 'address'),
          mac: value(row, 'mac-address', 'radio-mac'),
          localInterface: value(row, 'interface', 'radio-name'),
        });
      }
    }

    for (const row of rowsFor(device, '/routing/ospf/neighbor/print')) {
      observe(device, row, {
        source: 'ospf',
        path: '/routing/ospf/neighbor/print',
        weight: 92,
        type: 'routing',
        name: value(row, 'router-id', 'instance'),
        ip: value(row, 'address', 'remote-address', 'router-id'),
        localInterface: value(row, 'interface'),
      });
    }

    for (const row of rowsFor(device, '/ip/arp/print')) {
      observe(device, row, {
        source: 'arp',
        path: '/ip/arp/print',
        weight: 30,
        type: 'unknown',
        ip: value(row, 'address'),
        mac: value(row, 'mac-address'),
        localInterface: value(row, 'interface'),
      });
    }

    for (const row of rowsFor(device, '/ip/dhcp-server/lease/print')) {
      observe(device, row, {
        source: 'dhcp',
        path: '/ip/dhcp-server/lease/print',
        weight: 28,
        type: 'unknown',
        name: value(row, 'host-name', 'comment'),
        ip: value(row, 'active-address', 'address'),
        mac: value(row, 'active-mac-address', 'mac-address'),
        localInterface: value(row, 'server'),
      });
    }
  }

  for (const manualLink of manualLinks) {
    for (const nodeId of [manualLink.sourceNodeId, manualLink.targetNodeId]) {
      if (!nodes.has(nodeId)) {
        nodes.set(nodeId, {
          id: nodeId,
          label: nodeId,
          host: null,
          status: 'manual',
          type: 'unknown',
          managed: false,
          lastSeenAt: null,
          sourceDeviceIds: [],
          sourceIds: new Set(),
          aliases: new Set(),
        });
      }
    }
    addEvidence(
      manualLink.sourceNodeId,
      manualLink.targetNodeId,
      {
        source: 'manual',
        path: 'manual',
        observedAt: dateString(manualLink.updatedAt) ?? now.toISOString(),
        weight: 100,
        localInterface: manualLink.label || 'Manual',
        details: { id: manualLink.id, label: manualLink.label ?? '' },
      },
      'manual',
    );
  }

  const staleBefore = now.getTime() - 35 * 60 * 1000;
  const resolvedLinks = [...links.values()].map<TopologyLink>((link) => {
    const { confidence, score } = confidenceFor(link.evidence);
    const latestObservedAt =
      link.evidence
        .map((item) => item.observedAt)
        .sort()
        .at(-1) ?? now.toISOString();
    const manual = confidence === 'manual';
    return {
      id: link.id,
      source: link.source,
      target: link.target,
      label: [...link.interfaces].join(' ↔ ') || (manual ? 'Manual' : bestType(link.types)),
      managed: Boolean(nodes.get(link.source)?.managed && nodes.get(link.target)?.managed),
      type: bestType(link.types),
      confidence,
      confidenceScore: score,
      status: manual
        ? 'manual'
        : new Date(latestObservedAt).getTime() < staleBefore
          ? 'stale'
          : 'active',
      lastObservedAt: latestObservedAt,
      evidence: link.evidence.sort((left, right) => right.weight - left.weight),
    };
  });

  const connectedManagedIds = new Set<string>();
  for (const link of resolvedLinks) {
    if (!link.managed || link.confidence === 'unresolved') continue;
    connectedManagedIds.add(link.source);
    connectedManagedIds.add(link.target);
  }

  const publicNodes = [...nodes.values()].map<TopologyNode>(
    ({ aliases: _aliases, sourceIds: _sourceIds, ...node }) => ({
      ...node,
      sourceDeviceIds: [...new Set(node.sourceDeviceIds)],
    }),
  );
  const confidenceCounts = (confidence: TopologyConfidence) =>
    resolvedLinks.filter((link) => link.confidence === confidence).length;

  return {
    nodes: publicNodes.sort(
      (left, right) =>
        Number(right.managed) - Number(left.managed) || left.label.localeCompare(right.label),
    ),
    links: resolvedLinks.sort((left, right) => right.confidenceScore - left.confidenceScore),
    summary: {
      nodes: publicNodes.length,
      links: resolvedLinks.length,
      devices: devices.length,
      managedLinks: resolvedLinks.filter((link) => link.managed).length,
      connectedDevices: connectedManagedIds.size,
      isolatedDevices: Math.max(0, devices.length - connectedManagedIds.size),
      confirmedLinks: confidenceCounts('confirmed'),
      inferredLinks: confidenceCounts('inferred'),
      unresolvedLinks: confidenceCounts('unresolved'),
      manualLinks: confidenceCounts('manual'),
      evidenceSources: resolvedLinks.reduce((total, link) => total + link.evidence.length, 0),
    },
  };
}
