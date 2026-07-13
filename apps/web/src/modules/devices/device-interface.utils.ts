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
  const rows = new Map<string, InterfaceExplorerRow>();

  const interfaceSections = sections.filter((section) =>
    ['/interface/print', '/interface/ethernet/print'].includes(section.path),
  );
  for (const section of interfaceSections) {
    for (const item of section.items ?? []) {
      const raw = asRecord(item.raw);
      const name = text(raw.name) ?? text(raw.interface) ?? item.name ?? 'unknown';
      const existing = rows.get(name);

      rows.set(name, {
        id: existing?.id ?? item.id ?? recordId(raw, `${section.id}-${rows.size}`),
        name,
        type: text(raw.type) ?? existing?.type ?? section.name,
        running: text(raw.running) ?? existing?.running,
        disabled: text(raw.disabled) ?? existing?.disabled,
        mtu: text(raw.mtu) ?? existing?.mtu,
        actualMtu: text(raw.actualMtu) ?? text(raw['actual-mtu']) ?? existing?.actualMtu,
        macAddress: text(raw.macAddress) ?? text(raw['mac-address']) ?? existing?.macAddress,
        comment: text(raw.comment) ?? existing?.comment,
        raw: { ...(existing?.raw ?? {}), ...raw },
      });
    }
  }

  return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function interfaceStatus(
  row: InterfaceExplorerRow,
): 'disabled' | 'running' | 'down' | 'unknown' {
  if (row.disabled === 'true' || row.disabled === 'yes') return 'disabled';
  if (row.running === 'true' || row.running === 'yes') return 'running';
  if (row.running === 'false' || row.running === 'no') return 'down';
  return 'unknown';
}
