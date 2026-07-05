export interface RouterOsInterfaceTraffic {
  name?: string;
  rxBitsPerSecond?: string;
  txBitsPerSecond?: string;
  rxPacketsPerSecond?: string;
  txPacketsPerSecond?: string;
  rxDropsPerSecond?: string;
  txDropsPerSecond?: string;
  rxErrorsPerSecond?: string;
  txErrorsPerSecond?: string;
}

export interface RouterOsHealth {
  name?: string;
  value?: string;
  type?: string;
}

export interface RouterOsSystemClock {
  time?: string;
  date?: string;
  timeZoneName?: string;
  gmtOffset?: string;
}
