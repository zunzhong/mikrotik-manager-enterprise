export interface RouterOsPingResult {
  host?: string;
  seq?: string;
  size?: string;
  ttl?: string;
  time?: string;
  status?: string;
  packetLoss?: string;
  minRtt?: string;
  avgRtt?: string;
  maxRtt?: string;
}

export interface RouterOsTracerouteHop {
  address?: string;
  loss?: string;
  sent?: string;
  last?: string;
  avg?: string;
  best?: string;
  worst?: string;
  stdDev?: string;
  status?: string;
}

export interface RouterOsTorchEntry {
  srcAddress?: string;
  dstAddress?: string;
  tx?: string;
  rx?: string;
  txPackets?: string;
  rxPackets?: string;
  protocol?: string;
  port?: string;
}

export interface RouterOsBandwidthTestResult {
  status?: string;
  txCurrent?: string;
  rxCurrent?: string;
  txTotalAverage?: string;
  rxTotalAverage?: string;
  lostPackets?: string;
  randomData?: string;
  direction?: string;
}
