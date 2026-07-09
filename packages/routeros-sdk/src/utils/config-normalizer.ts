import type { RouterOsRecord } from '../core/routeros-record.js';
import type { RouterOsConfigItem } from '../models/config-diff.js';

function stableName(record: RouterOsRecord): string | undefined {
  return (
    record.name ??
    record.comment ??
    record.address ??
    record.interface ??
    record['.id'] ??
    record.id
  );
}

export function normalizeConfigItem(path: string, record: RouterOsRecord): RouterOsConfigItem {
  const id = record['.id'] ?? record.id;
  const name = stableName(record);
  const key = `${path}:${id ?? name ?? JSON.stringify(record)}`;

  return {
    key,
    path,
    id,
    name,
    attributes: { ...record },
  };
}

export function normalizeConfigList(path: string, records: RouterOsRecord[]): RouterOsConfigItem[] {
  return records.map((record) => normalizeConfigItem(path, record));
}
