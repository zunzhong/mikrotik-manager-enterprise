import type { RouterOsRecord } from '../core/routeros-record.js';
import type {
  RouterOsBandwidthTestResult,
  RouterOsPingResult,
  RouterOsTorchEntry,
  RouterOsTracerouteHop,
} from '../models/diagnostics.js';
import { stringField } from './mapper-utils.js';

export function mapPingResult(record: RouterOsRecord): RouterOsPingResult {
  return {
    host: stringField(record, 'host'),
    seq: stringField(record, 'seq'),
    size: stringField(record, 'size'),
    ttl: stringField(record, 'ttl'),
    time: stringField(record, 'time'),
    status: stringField(record, 'status'),
    packetLoss: stringField(record, 'packetLoss'),
    minRtt: stringField(record, 'minRtt'),
    avgRtt: stringField(record, 'avgRtt'),
    maxRtt: stringField(record, 'maxRtt'),
  };
}
export function mapTracerouteHop(record: RouterOsRecord): RouterOsTracerouteHop {
  return {
    address: stringField(record, 'address'),
    loss: stringField(record, 'loss'),
    sent: stringField(record, 'sent'),
    last: stringField(record, 'last'),
    avg: stringField(record, 'avg'),
    best: stringField(record, 'best'),
    worst: stringField(record, 'worst'),
    stdDev: stringField(record, 'stdDev'),
    status: stringField(record, 'status'),
  };
}
export function mapTorchEntry(record: RouterOsRecord): RouterOsTorchEntry {
  return {
    srcAddress: stringField(record, 'srcAddress'),
    dstAddress: stringField(record, 'dstAddress'),
    tx: stringField(record, 'tx'),
    rx: stringField(record, 'rx'),
    txPackets: stringField(record, 'txPackets'),
    rxPackets: stringField(record, 'rxPackets'),
    protocol: stringField(record, 'protocol'),
    port: stringField(record, 'port'),
  };
}
export function mapBandwidthTestResult(record: RouterOsRecord): RouterOsBandwidthTestResult {
  return {
    status: stringField(record, 'status'),
    txCurrent: stringField(record, 'txCurrent'),
    rxCurrent: stringField(record, 'rxCurrent'),
    txTotalAverage: stringField(record, 'txTotalAverage'),
    rxTotalAverage: stringField(record, 'rxTotalAverage'),
    lostPackets: stringField(record, 'lostPackets'),
    randomData: stringField(record, 'randomData'),
    direction: stringField(record, 'direction'),
  };
}
