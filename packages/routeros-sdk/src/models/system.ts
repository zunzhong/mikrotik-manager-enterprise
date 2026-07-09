export interface RouterOsIdentity {
  name?: string;
}

export interface RouterOsResource {
  uptime?: string;
  version?: string;
  buildTime?: string;
  factorySoftware?: string;
  freeMemory?: string;
  totalMemory?: string;
  cpu?: string;
  cpuCount?: string;
  cpuFrequency?: string;
  cpuLoad?: string;
  freeHddSpace?: string;
  totalHddSpace?: string;
  architectureName?: string;
  architecture?: string;
  boardName?: string;
  platform?: string;
}

export interface RouterOsRouterboard {
  routerboard?: string;
  boardName?: string;
  model?: string;
  serialNumber?: string;
  firmwareType?: string;
  factoryFirmware?: string;
  currentFirmware?: string;
  upgradeFirmware?: string;
}
