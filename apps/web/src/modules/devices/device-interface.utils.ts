import type { InventorySectionDetail, InventorySnapshotSummary } from './device-inventory.types';

export interface InterfaceExplorerRow {
  id: string;
  name: string;
  type?: string;
  running?: string;
  disabled?: string;
  mtu?: string;
  actualMtu?: string;
  macAddress?: string;
  comment?: string;
  raw: Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

function recordId(record: Record<string, unknown>, fallback: string): string {
  return text(record.id) ?? text(record['.id']) ?? text(record.name) ?? fallback;
}

export function isInterfaceSection(
  section: Pick<InventorySectionDetail, 'path' | 'name' | 'category'>,
): boolean {
  const path = section.path.toLowerCase();
  const name = section.name.toLowerCase();
  const category = section.category.toLowerCase();

  return (
    path.includes('/interface') || name.includes('interface') || category.includes('interface')
  );
}

export function interfaceSectionCount(
  snapshot: InventorySnapshotSummary | null | undefined,
): number {
  return snapshot?.sections?.filter(isInterfaceSection).length ?? 0;
}

export function mapInterfaceRows(sections: InventorySectionDetail[]): InterfaceExplorerRow[] {
  const rows: InterfaceExplorerRow[] = [];

  for (const section of sections.filter(isInterfaceSection)) {
    for (const item of section.items ?? []) {
      const raw = asRecord(item.raw);

      rows.push({
        id: item.id ?? recordId(raw, `${section.id}-${rows.length}`),
        name: text(raw.name) ?? item.name ?? 'unknown',
        type: text(raw.type) ?? section.name,
        running: text(raw.running),
        disabled: text(raw.disabled),
        mtu: text(raw.mtu),
        actualMtu: text(raw.actualMtu),
        macAddress: text(raw.macAddress),
        comment: text(raw.comment),
        raw,
      });
    }
  }

  return rows;
}

export function interfaceStatus(
  row: InterfaceExplorerRow,
): 'disabled' | 'running' | 'down' | 'unknown' {
  if (row.disabled === 'true' || row.disabled === 'yes') return 'disabled';
  if (row.running === 'true' || row.running === 'yes') return 'running';
  if (row.running === 'false' || row.running === 'no') return 'down';
  return 'unknown';
}
