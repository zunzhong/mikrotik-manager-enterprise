export interface RouterOsWirelessInterface {
  id?: string;
  name?: string;
  mtu?: string;
  macAddress?: string;
  interfaceType?: string;
  mode?: string;
  ssid?: string;
  frequency?: string;
  band?: string;
  channelWidth?: string;
  securityProfile?: string;
  disabled?: string;
  running?: string;
  comment?: string;
}

export interface RouterOsWifiInterface {
  id?: string;
  name?: string;
  defaultName?: string;
  configuration?: string;
  configurationMode?: string;
  configurationSsid?: string;
  disabled?: string;
  running?: string;
  comment?: string;
}
