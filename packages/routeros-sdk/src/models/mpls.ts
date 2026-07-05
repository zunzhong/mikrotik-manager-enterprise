export interface RouterOsMplsInterface {
  id?: string;
  interface?: string;
  mplsMtu?: string;
  disabled?: string;
  comment?: string;
}

export interface RouterOsLdpNeighbor {
  id?: string;
  transport?: string;
  address?: string;
  identity?: string;
  uptime?: string;
  disabled?: string;
}

export interface RouterOsVplsInterface {
  id?: string;
  name?: string;
  remotePeer?: string;
  vplsId?: string;
  ciscoStyle?: string;
  disabled?: string;
  running?: string;
  comment?: string;
}
