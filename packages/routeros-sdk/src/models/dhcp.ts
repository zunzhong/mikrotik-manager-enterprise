export interface RouterOsDhcpServer {
  id?: string;
  name?: string;
  interface?: string;
  leaseTime?: string;
  addressPool?: string;
  authoritative?: string;
  useRadius?: string;
  disabled?: string;
  invalid?: string;
  dynamic?: string;
  comment?: string;
}

export interface RouterOsDhcpLease {
  id?: string;
  address?: string;
  macAddress?: string;
  clientId?: string;
  addressLists?: string;
  server?: string;
  dhcpOption?: string;
  status?: string;
  expiresAfter?: string;
  activeAddress?: string;
  activeMacAddress?: string;
  activeClientId?: string;
  activeServer?: string;
  hostName?: string;
  dynamic?: string;
  blocked?: string;
  disabled?: string;
  comment?: string;
}

export interface RouterOsDhcpNetwork {
  id?: string;
  address?: string;
  gateway?: string;
  netmask?: string;
  dnsServer?: string;
  winsServer?: string;
  ntpServer?: string;
  domain?: string;
  comment?: string;
}
