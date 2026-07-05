export interface RouterOsRoutingTable {
  id?: string;
  name?: string;
  fib?: string;
  disabled?: string;
  comment?: string;
}

export interface RouterOsRoutingRule {
  id?: string;
  action?: string;
  table?: string;
  srcAddress?: string;
  dstAddress?: string;
  interface?: string;
  minPrefix?: string;
  disabled?: string;
  comment?: string;
}

export interface RouterOsVrf {
  id?: string;
  name?: string;
  interfaces?: string;
  placeBefore?: string;
  disabled?: string;
  comment?: string;
}

export interface RouterOsBfdConfiguration {
  id?: string;
  interfaces?: string;
  minRx?: string;
  minTx?: string;
  multiplier?: string;
  disabled?: string;
  comment?: string;
}
