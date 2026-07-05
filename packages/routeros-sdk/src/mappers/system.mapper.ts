import type { RouterOsRecord } from '../core/routeros-record.js';
import type { RouterOsIdentity, RouterOsResource, RouterOsRouterboard } from '../models/system.js';
import { stringField } from './mapper-utils.js';

export function mapIdentity(record: RouterOsRecord): RouterOsIdentity {
  return { name: stringField(record, 'name') };
}

export function mapResource(record: RouterOsRecord): RouterOsResource {
  return {
    uptime: stringField(record, 'uptime'),
    version: stringField(record, 'version'),
    buildTime: stringField(record, 'buildTime'),
    factorySoftware: stringField(record, 'factorySoftware'),
    freeMemory: stringField(record, 'freeMemory'),
    totalMemory: stringField(record, 'totalMemory'),
    cpu: stringField(record, 'cpu'),
    cpuCount: stringField(record, 'cpuCount'),
    cpuFrequency: stringField(record, 'cpuFrequency'),
    cpuLoad: stringField(record, 'cpuLoad'),
    freeHddSpace: stringField(record, 'freeHddSpace'),
    totalHddSpace: stringField(record, 'totalHddSpace'),
    architectureName: stringField(record, 'architectureName'),
    architecture: stringField(record, 'architecture'),
    boardName: stringField(record, 'boardName'),
    platform: stringField(record, 'platform'),
  };
}

export function mapRouterboard(record: RouterOsRecord): RouterOsRouterboard {
  return {
    routerboard: stringField(record, 'routerboard'),
    boardName: stringField(record, 'boardName'),
    model: stringField(record, 'model'),
    serialNumber: stringField(record, 'serialNumber'),
    firmwareType: stringField(record, 'firmwareType'),
    factoryFirmware: stringField(record, 'factoryFirmware'),
    currentFirmware: stringField(record, 'currentFirmware'),
    upgradeFirmware: stringField(record, 'upgradeFirmware'),
  };
}
