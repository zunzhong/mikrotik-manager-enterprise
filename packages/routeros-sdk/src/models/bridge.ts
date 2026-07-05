export interface RouterOsBridge {
  id?: string;
  name?: string;
  mtu?: string;
  actualMtu?: string;
  l2mtu?: string;
  arp?: string;
  macAddress?: string;
  protocolMode?: string;
  fastForward?: string;
  igmpSnooping?: string;
  vlanFiltering?: string;
  dhcpSnooping?: string;
  disabled?: string;
  comment?: string;
}

export interface RouterOsBridgePort {
  id?: string;
  interface?: string;
  bridge?: string;
  priority?: string;
  pathCost?: string;
  internalPathCost?: string;
  edge?: string;
  pointToPoint?: string;
  learn?: string;
  horizon?: string;
  hw?: string;
  pvid?: string;
  frameTypes?: string;
  ingressFiltering?: string;
  disabled?: string;
  dynamic?: string;
  inactive?: string;
  comment?: string;
}
