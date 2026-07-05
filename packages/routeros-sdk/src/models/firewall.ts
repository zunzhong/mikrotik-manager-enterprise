export interface RouterOsFirewallFilterRule {
  id?: string;
  chain?: string;
  action?: string;
  srcAddress?: string;
  dstAddress?: string;
  protocol?: string;
  srcPort?: string;
  dstPort?: string;
  inInterface?: string;
  outInterface?: string;
  connectionState?: string;
  disabled?: string;
  dynamic?: string;
  invalid?: string;
  comment?: string;
}

export interface RouterOsFirewallNatRule {
  id?: string;
  chain?: string;
  action?: string;
  srcAddress?: string;
  dstAddress?: string;
  protocol?: string;
  srcPort?: string;
  dstPort?: string;
  toAddresses?: string;
  toPorts?: string;
  outInterface?: string;
  disabled?: string;
  dynamic?: string;
  invalid?: string;
  comment?: string;
}

export interface RouterOsFirewallAddressListEntry {
  id?: string;
  list?: string;
  address?: string;
  creationTime?: string;
  timeout?: string;
  dynamic?: string;
  disabled?: string;
  comment?: string;
}
