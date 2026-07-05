import type { RouterOsRecord } from '../core/routeros-record.js';
import type { RouterOsRealtimeTrafficSample } from '../models/realtime.js';
import { stringField } from './mapper-utils.js';

export function mapRealtimeTraffic(record: RouterOsRecord): RouterOsRealtimeTrafficSample {
  return {
    name: stringField(record, 'name'),
    rxBitsPerSecond: stringField(record, 'rxBitsPerSecond'),
    txBitsPerSecond: stringField(record, 'txBitsPerSecond'),
    rxPacketsPerSecond: stringField(record, 'rxPacketsPerSecond'),
    txPacketsPerSecond: stringField(record, 'txPacketsPerSecond'),
    rxDropsPerSecond: stringField(record, 'rxDropsPerSecond'),
    txDropsPerSecond: stringField(record, 'txDropsPerSecond'),
    rxErrorsPerSecond: stringField(record, 'rxErrorsPerSecond'),
    txErrorsPerSecond: stringField(record, 'txErrorsPerSecond'),
    sampledAt: new Date().toISOString(),
  };
}
