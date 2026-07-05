export type RouterOsRecord = Record<string, string>;

export function toCamelCase(key: string): string {
  return key.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}

export function normalizeRecord(record: RouterOsRecord): RouterOsRecord {
  const normalized: RouterOsRecord = {};
  for (const [key, value] of Object.entries(record)) {
    normalized[toCamelCase(key)] = value;
  }
  return normalized;
}

export function numberValue(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function booleanValue(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  if (['true', 'yes'].includes(value)) return true;
  if (['false', 'no'].includes(value)) return false;
  return undefined;
}
