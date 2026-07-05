export interface RouterOsIpAddress {
  id?: string;
  address?: string;
  network?: string;
  interface?: string;
  actualInterface?: string;
  invalid?: string;
  dynamic?: string;
  disabled?: string;
  comment?: string;
}

export interface RouterOsRoute {
  id?: string;
  dstAddress?: string;
  gateway?: string;
  distance?: string;
  routingTable?: string;
  prefSrc?: string;
  immediateGw?: string;
  active?: string;
  dynamic?: string;
  disabled?: string;
  comment?: string;
}

export interface RouterOsDnsSettings {
  servers?: string;
  dynamicServers?: string;
  useDohServer?: string;
  verifyDohCert?: string;
  allowRemoteRequests?: string;
  cacheSize?: string;
  cacheMaxTtl?: string;
  cacheUsed?: string;
}
