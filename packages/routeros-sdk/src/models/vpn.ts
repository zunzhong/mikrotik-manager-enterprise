export interface RouterOsWireGuardInterface {
  id?: string;
  name?: string;
  mtu?: string;
  listenPort?: string;
  privateKey?: string;
  publicKey?: string;
  running?: string;
  disabled?: string;
  comment?: string;
}

export interface RouterOsWireGuardPeer {
  id?: string;
  interface?: string;
  publicKey?: string;
  presharedKey?: string;
  allowedAddress?: string;
  endpointAddress?: string;
  endpointPort?: string;
  currentEndpointAddress?: string;
  currentEndpointPort?: string;
  persistentKeepalive?: string;
  rx?: string;
  tx?: string;
  lastHandshake?: string;
  disabled?: string;
  comment?: string;
}

export interface RouterOsTunnelInterface {
  id?: string;
  name?: string;
  localAddress?: string;
  remoteAddress?: string;
  keepalive?: string;
  running?: string;
  disabled?: string;
  comment?: string;
}

export interface RouterOsIpSecPeer {
  id?: string;
  name?: string;
  address?: string;
  localAddress?: string;
  profile?: string;
  exchangeMode?: string;
  passive?: string;
  disabled?: string;
  comment?: string;
}

export interface RouterOsIpSecIdentity {
  id?: string;
  peer?: string;
  authMethod?: string;
  remoteId?: string;
  certificate?: string;
  generatePolicy?: string;
  disabled?: string;
  comment?: string;
}

export interface RouterOsIpSecPolicy {
  id?: string;
  peer?: string;
  tunnel?: string;
  srcAddress?: string;
  dstAddress?: string;
  protocol?: string;
  action?: string;
  level?: string;
  proposal?: string;
  disabled?: string;
  dynamic?: string;
  invalid?: string;
  comment?: string;
}
