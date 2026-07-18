import { useEffect, useMemo, useState } from 'react';
import { deviceApi } from './device.api';
import type { InventorySnapshotSummary } from './device-inventory.types';
import { buildDeviceFacts, buildDeviceMetricBars } from './device-metric-chart.utils';

export interface DeviceMetricChartsProps {
  deviceId: string;
}

export function DeviceMetricCharts({ deviceId }: DeviceMetricChartsProps) {
  const [snapshot, setSnapshot] = useState<InventorySnapshotSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      setSnapshot(await deviceApi.latestInventorySnapshot(deviceId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot load device metrics');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [deviceId]);

  const bars = useMemo(() => buildDeviceMetricBars(snapshot), [snapshot]);
  const facts = useMemo(() => buildDeviceFacts(snapshot), [snapshot]);

  return (
    <section className="device-metric-charts">
      <header className="device-metric-charts__header">
        <div>
          <p className="device-metric-charts__eyebrow">Dashboard Metrics</p>
          <h3>Resource Overview</h3>
        </div>

        <button type="button" onClick={() => void load()}>
          Refresh
        </button>
      </header>

      {error ? <div className="device-metric-charts__error">{error}</div> : null}
      {loading ? <p className="device-metric-charts__muted">Loading metrics...</p> : null}

      <div className="device-metric-charts__grid">
        {bars.map((bar) => (
          <article className="device-metric-charts__card" key={bar.label}>
            <div className="device-metric-charts__card-header">
              <span>{bar.label}</span>
              <strong>{bar.percent}%</strong>
            </div>

            <div className="device-metric-charts__bar" aria-label={`${bar.label}: ${bar.percent}%`}>
              <span style={{ width: `${bar.percent}%` }} />
            </div>

            <p>{bar.valueText}</p>
            {bar.hint ? <small>{bar.hint}</small> : null}
          </article>
        ))}
      </div>

      <div className="device-metric-charts__facts">
        {facts.map((fact) => (
          <div key={fact.label}>
            <span>{fact.label}</span>
            <strong>{fact.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
