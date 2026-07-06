import { useEffect, useMemo, useState } from 'react';
import { deviceApi } from './device.api';
import type { InventorySnapshotSummary } from './device-inventory.types';
import { formatMaybe, snapshotSummary } from './device-dashboard.utils';

export interface DeviceDashboardProps {
  deviceId: string;
}

export function DeviceDashboard({ deviceId }: DeviceDashboardProps) {
  const [snapshot, setSnapshot] = useState<InventorySnapshotSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadLatest() {
    setLoading(true);
    setError(null);

    try {
      setSnapshot(await deviceApi.latestInventorySnapshot(deviceId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot load inventory snapshot');
    } finally {
      setLoading(false);
    }
  }

  async function syncNow() {
    setSyncing(true);
    setError(null);

    try {
      await deviceApi.collectInventory(deviceId);
      await loadLatest();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot sync inventory');
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    void loadLatest();
  }, [deviceId]);

  const info = useMemo(() => snapshotSummary(snapshot), [snapshot]);

  if (loading) {
    return (
      <section className="device-dashboard">
        <div className="device-dashboard__card">Loading device dashboard...</div>
      </section>
    );
  }

  return (
    <section className="device-dashboard">
      <header className="device-dashboard__header">
        <div>
          <p className="device-dashboard__eyebrow">Device Dashboard</p>
          <h2>{info.identity}</h2>
          <p className="device-dashboard__muted">
            Latest inventory: {snapshot?.collectedAt ?? 'No snapshot yet'}
          </p>
        </div>

        <button
          className="device-dashboard__button"
          type="button"
          onClick={() => void syncNow()}
          disabled={syncing}
        >
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </header>

      {error ? <div className="device-dashboard__error">{error}</div> : null}

      <div className="device-dashboard__grid">
        <MetricCard label="RouterOS" value={formatMaybe(info.version)} />
        <MetricCard label="Architecture" value={formatMaybe(info.architecture)} />
        <MetricCard label="Board" value={formatMaybe(info.board)} />
        <MetricCard label="Serial" value={formatMaybe(info.serial)} />
        <MetricCard label="Uptime" value={formatMaybe(info.uptime)} />
        <MetricCard label="CPU Load" value={formatMaybe(info.cpuLoad)} />
        <MetricCard label="Free Memory" value={formatMaybe(info.freeMemory)} />
        <MetricCard label="Free Disk" value={formatMaybe(info.freeDisk)} />
      </div>

      <div className="device-dashboard__card">
        <h3>Inventory Sections</h3>
        {snapshot?.sections?.length ? (
          <table className="device-dashboard__table">
            <thead>
              <tr>
                <th>Section</th>
                <th>Category</th>
                <th>Path</th>
                <th>Items</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.sections.map((section) => (
                <tr key={section.id}>
                  <td>{section.name}</td>
                  <td>{section.category}</td>
                  <td>{section.path}</td>
                  <td>{section.itemCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="device-dashboard__muted">
            No inventory snapshot yet. Click Sync Now to collect data.
          </p>
        )}
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="device-dashboard__card">
      <p className="device-dashboard__label">{label}</p>
      <strong>{value}</strong>
    </article>
  );
}
