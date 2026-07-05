export interface RouterOsOspfInstance {
  id?: string;
  name?: string;
  version?: string;
  vrf?: string;
  routerId?: string;
  redistribute?: string;
  disabled?: string;
  comment?: string;
}

export interface RouterOsOspfArea {
  id?: string;
  name?: string;
  instance?: string;
  areaId?: string;
  type?: string;
  defaultCost?: string;
  disabled?: string;
  comment?: string;
}

export interface RouterOsOspfInterfaceTemplate {
  id?: string;
  interfaces?: string;
  networks?: string;
  area?: string;
  cost?: string;
  priority?: string;
  type?: string;
  auth?: string;
  disabled?: string;
  comment?: string;
}

export interface RouterOsOspfNeighbor {
  id?: string;
  instance?: string;
  area?: string;
  routerId?: string;
  address?: string;
  interface?: string;
  priority?: string;
  state?: string;
  stateChanges?: string;
  lsRetransmits?: string;
}
