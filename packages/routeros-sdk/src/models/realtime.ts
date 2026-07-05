export interface RouterOsRealtimeTrafficSample {
  name?: string;
  rxBitsPerSecond?: string;
  txBitsPerSecond?: string;
  rxPacketsPerSecond?: string;
  txPacketsPerSecond?: string;
  rxDropsPerSecond?: string;
  txDropsPerSecond?: string;
  rxErrorsPerSecond?: string;
  txErrorsPerSecond?: string;
  sampledAt: string;
}

export interface RouterOsRateSnapshot {
  rxBps: number;
  txBps: number;
  rxPps: number;
  txPps: number;
  sampledAt: Date;
}

export interface RouterOsLteMonitor {
  status?: string;
  pinStatus?: string;
  registrationStatus?: string;
  functionality?: string;
  manufacturer?: string;
  model?: string;
  revision?: string;
  currentOperator?: string;
  accessTechnology?: string;
  signalStrength?: string;
  rsrp?: string;
  rsrq?: string;
  sinr?: string;
}

export interface RouterOsWirelessRegistration {
  id?: string;
  interface?: string;
  macAddress?: string;
  ap?: string;
  wds?: string;
  bridge?: string;
  rxRate?: string;
  txRate?: string;
  packets?: string;
  bytes?: string;
  uptime?: string;
  signalStrength?: string;
  txSignalStrength?: string;
  signalToNoise?: string;
  txCcq?: string;
  rxCcq?: string;
}
