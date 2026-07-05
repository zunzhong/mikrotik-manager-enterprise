import type { RouterOsRecord } from '../core/routeros-record.js';

export function stringField(record: RouterOsRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function numberField(record: RouterOsRecord, key: string): number | undefined {
  const value = record[key];
  if (value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function booleanField(record: RouterOsRecord, key: string): boolean | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (value === 'true' || value === 'yes') return true;
  if (value === 'false' || value === 'no') return false;
  return undefined;
}

export function mapList<T>(records: RouterOsRecord[], mapper: (record: RouterOsRecord) => T): T[] {
  return records.map(mapper);
}
