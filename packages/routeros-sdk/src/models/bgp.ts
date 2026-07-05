export interface RouterOsBgpConnection {
  id?: string;
  name?: string;
  remoteAddress?: string;
  remoteAs?: string;
  localAddress?: string;
  localAs?: string;
  routerId?: string;
  routingTable?: string;
  templates?: string;
  connect?: string;
  listen?: string;
  disabled?: string;
  comment?: string;
}

export interface RouterOsBgpTemplate {
  id?: string;
  name?: string;
  as?: string;
  routerId?: string;
  routingTable?: string;
  addressFamilies?: string;
  outputNetwork?: string;
  inputFilter?: string;
  outputFilterChain?: string;
  disabled?: string;
  comment?: string;
}

export interface RouterOsBgpSession {
  id?: string;
  name?: string;
  remoteAddress?: string;
  remoteAs?: string;
  localAddress?: string;
  localAs?: string;
  uptime?: string;
  prefixCount?: string;
  state?: string;
  established?: string;
  disabled?: string;
}

export interface RouterOsBgpAdvertisement {
  id?: string;
  peer?: string;
  prefix?: string;
  nexthop?: string;
  asPath?: string;
  origin?: string;
  localPref?: string;
  med?: string;
}
