import type { RouterOsRecord } from '../core/routeros-record.js';
import type { RouterOsInterface } from '../models/interface.js';
import { stringField } from './mapper-utils.js';

export function mapInterface(record: RouterOsRecord): RouterOsInterface {
  return {
    id: stringField(record, 'id') ?? stringField(record, '.id'),
    name: stringField(record, 'name'),
    type: stringField(record, 'type'),
    mtu: stringField(record, 'mtu'),
    actualMtu: stringField(record, 'actualMtu'),
    l2mtu: stringField(record, 'l2mtu'),
    macAddress: stringField(record, 'macAddress'),
    disabled: stringField(record, 'disabled'),
    running: stringField(record, 'running'),
    comment: stringField(record, 'comment'),
  };
}
