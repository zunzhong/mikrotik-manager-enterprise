import { useEffect, useMemo, useState } from 'react';
import { deviceApi } from './device.api';
import type { InventorySnapshotSummary } from './device-inventory.types';

export interface DeviceInventoryTimelineProps {
  deviceId: string;
  onSelectSnapshot?: (snapshotId: string) => void;
}

export function DeviceInventoryTimeline({
  deviceId,
  onSelectSnapshot,
}: DeviceInventoryTimelineProps) {
  const [snapshots, setSnapshots] = useState<InventorySnapshotSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      setSnapshots(await deviceApi.inventorySnapshots(deviceId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot load inventory timeline');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [deviceId]);

  const latest = useMemo(() => snapshots[0], [snapshots]);

  return (
    <section className="device-inventory-timeline">
      <header className="device-inventory-timeline__header">
        <div>
          <p className="device-inventory-timeline__eyebrow">Inventory Timeline</p>
          <h3>Snapshot History</h3>
          <p className="device-inventory-timeline__muted">
            {snapshots.length} snapshots · Latest: {latest?.collectedAt ?? 'N/A'}
          </p>
        </div>

        <button type="button" onClick={() => void load()}>
          Refresh Timeline
        </button>
      </header>

      {error ? <div className="device-inventory-timeline__error">{error}</div> : null}

      {loading ? <p className="device-inventory-timeline__muted">Loading snapshots...</p> : null}

      {!loading && snapshots.length === 0 ? (
        <div className="device-inventory-timeline__empty">
          <strong>No inventory snapshots yet</strong>
          <p>Use Sync Inventory or Collect Inventory to create the first snapshot.</p>
        </div>
      ) : null}

      <div className="device-inventory-timeline__list">
        {snapshots.map((snapshot, index) => (
          <button
            className={`device-inventory-timeline__item ${index === 0 ? 'latest' : ''}`}
            key={snapshot.id}
            type="button"
            onClick={() => onSelectSnapshot?.(snapshot.id)}
          >
            <span className="device-inventory-timeline__dot" />
            <span>
              <strong>{new Date(snapshot.collectedAt).toLocaleString()}</strong>
              <small>
                {snapshot.status} · {snapshot.source} · {snapshot.sectionCount} sections ·{' '}
                {snapshot.itemCount} items
              </small>
            </span>
            {index === 0 ? <em>Latest</em> : null}
          </button>
        ))}
      </div>
    </section>
  );
}
