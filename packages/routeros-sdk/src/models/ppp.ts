export interface RouterOsPppSecret {
  id?: string;
  name?: string;
  service?: string;
  callerId?: string;
  password?: string;
  profile?: string;
  localAddress?: string;
  remoteAddress?: string;
  routes?: string;
  limitBytesIn?: string;
  limitBytesOut?: string;
  lastLoggedOut?: string;
  disabled?: string;
  comment?: string;
}

export interface RouterOsPppActive {
  id?: string;
  name?: string;
  service?: string;
  callerId?: string;
  address?: string;
  uptime?: string;
  encoding?: string;
  sessionId?: string;
  radius?: string;
}

export interface RouterOsPppProfile {
  id?: string;
  name?: string;
  localAddress?: string;
  remoteAddress?: string;
  bridge?: string;
  rateLimit?: string;
  dnsServer?: string;
  useEncryption?: string;
  onlyOne?: string;
  changeTcpMss?: string;
  useCompression?: string;
  useMpls?: string;
  comment?: string;
}

export interface RouterOsPppoeClient {
  id?: string;
  name?: string;
  interface?: string;
  user?: string;
  serviceName?: string;
  acName?: string;
  profile?: string;
  addDefaultRoute?: string;
  defaultRouteDistance?: string;
  usePeerDns?: string;
  disabled?: string;
  running?: string;
  comment?: string;
}
