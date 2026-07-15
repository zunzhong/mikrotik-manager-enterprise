import { useEffect, useMemo, useState } from 'react';
import { deviceApi } from './device.api';
import type { InventorySectionDetail, InventorySnapshotSummary } from './device-inventory.types';
import {
  interfaceSectionCount,
  interfaceStatus,
  mapInterfaceRows,
  type InterfaceExplorerRow,
} from './device-interface.utils';
import { useLanguage } from '../../i18n/LanguageContext';

export interface DeviceInterfaceExplorerProps {
  deviceId: string;
}

export function DeviceInterfaceExplorer({ deviceId }: DeviceInterfaceExplorerProps) {
  const { formatDateTime } = useLanguage();
  const [snapshot, setSnapshot] = useState<InventorySnapshotSummary | null>(null);
  const [sections, setSections] = useState<InventorySectionDetail[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const latest = await deviceApi.latestInventorySnapshot(deviceId);
      setSnapshot(latest);

      if (latest?.id) {
        setSections(await deviceApi.inventorySnapshotSections(latest.id));
      } else {
        setSections([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot load interface inventory');
    } finally {
      setLoading(false);
    }
  }

  async function syncNow() {
    setSyncing(true);
    setError(null);

    try {
      await deviceApi.collectInventory(deviceId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot collect inventory');
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    void load();
  }, [deviceId]);

  const rows = useMemo(() => mapInterfaceRows(sections), [sections]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();

    return rows.filter((row) => {
      const status = interfaceStatus(row);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const matchesQuery =
        q.length === 0 ||
        row.name.toLowerCase().includes(q) ||
        (row.type ?? '').toLowerCase().includes(q) ||
        (row.macAddress ?? '').toLowerCase().includes(q) ||
        (row.comment ?? '').toLowerCase().includes(q);

      return matchesStatus && matchesQuery;
    });
  }, [query, rows, statusFilter]);

  if (loading) {
    return <section className="device-interface-explorer">Loading interfaces...</section>;
  }

  return (
    <section className="device-interface-explorer">
      <header className="device-interface-explorer__header">
        <div>
          <p className="device-interface-explorer__eyebrow">Interface Explorer</p>
          <h2>Interfaces</h2>
          <p className="device-interface-explorer__muted">
            Lần đồng bộ:{' '}
            {snapshot?.collectedAt ? formatDateTime(snapshot.collectedAt) : 'Chưa có dữ liệu'} ·
            Nhóm Interface: {interfaceSectionCount(snapshot)}
          </p>
        </div>

        <button type="button" onClick={() => void syncNow()} disabled={syncing}>
          {syncing ? 'Syncing...' : 'Sync Inventory'}
        </button>
      </header>

      {error ? <div className="device-interface-explorer__error">{error}</div> : null}

      <div className="device-interface-explorer__toolbar">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search interface, type, MAC, comment..."
        />

        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All status</option>
          <option value="running">Running</option>
          <option value="down">Down</option>
          <option value="disabled">Disabled</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>

      <div className="device-interface-explorer__card">
        {filteredRows.length > 0 ? (
          <InterfaceTable rows={filteredRows} />
        ) : (
          <p className="device-interface-explorer__muted">
            No interface data found. Click Sync Inventory first.
          </p>
        )}
      </div>
    </section>
  );
}

function InterfaceTable({ rows }: { rows: InterfaceExplorerRow[] }) {
  return (
    <table className="device-interface-explorer__table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Status</th>
          <th>MTU</th>
          <th>MAC</th>
          <th>Comment</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{row.name}</td>
            <td>{row.type ?? 'N/A'}</td>
            <td>
              <span data-status={interfaceStatus(row)}>{interfaceStatus(row)}</span>
            </td>
            <td>{row.actualMtu ?? row.mtu ?? 'N/A'}</td>
            <td>{row.macAddress ?? 'N/A'}</td>
            <td>{row.comment ?? ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
