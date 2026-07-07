import { useEffect, useMemo, useState } from 'react';
import { deviceApi } from './device.api';
import type { DeviceRealtimeSnapshot } from './device-realtime.types';
import { buildRealtimeMetrics, snapshotAge } from './device-realtime.utils';

export interface DeviceRealtimeMonitorProps {
  deviceId: string;
}

const refreshOptions = [5000, 10000, 30000];

export function DeviceRealtimeMonitor({ deviceId }: DeviceRealtimeMonitorProps) {
  const [snapshot, setSnapshot] = useState<DeviceRealtimeSnapshot | null>(null);
  const [refreshMs, setRefreshMs] = useState(5000);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);
  const [lastLoadedAt, setLastLoadedAt] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);

    try {
      const latest = await deviceApi.getRealtimeSnapshot(deviceId);
      setSnapshot(latest);
      setLastLoadedAt(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot load realtime data');
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setLoading(true);
    setError(null);

    try {
      const latest = await deviceApi.refreshRealtimeSnapshot(deviceId);
      setSnapshot(latest);
      setLastLoadedAt(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot refresh realtime data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [deviceId]);

  useEffect(() => {
    if (!autoRefresh) return undefined;

    const timer = window.setInterval(() => {
      void load();
    }, refreshMs);

    return () => window.clearInterval(timer);
  }, [autoRefresh, deviceId, refreshMs]);

  const metrics = useMemo(() => buildRealtimeMetrics(snapshot), [snapshot]);

  return (
    <section className="device-realtime-monitor">
      <header className="device-realtime-monitor__header">
        <div>
          <p className="device-realtime-monitor__eyebrow">Realtime Monitor</p>
          <h3>Realtime Cache</h3>
          <p className="device-realtime-monitor__muted">
            Source: backend realtime cache · Age: {snapshotAge(snapshot)} · Last UI refresh: {lastLoadedAt || 'N/A'}
          </p>
        </div>

        <div className="device-realtime-monitor__actions">
          <label>
            <input
              checked={autoRefresh}
              onChange={(event) => setAutoRefresh(event.target.checked)}
              type="checkbox"
            />
            Auto refresh
          </label>

          <select
            value={refreshMs}
            onChange={(event) => setRefreshMs(Number(event.target.value))}
            disabled={!autoRefresh}
          >
            {refreshOptions.map((option) => (
              <option key={option} value={option}>
                {option / 1000}s
              </option>
            ))}
          </select>

          <button type="button" onClick={() => void load()}>
            Read Cache
          </button>

          <button type="button" onClick={() => void refresh()} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh Router'}
          </button>
        </div>
      </header>

      {error ? <div className="device-realtime-monitor__error">{error}</div> : null}

      <div className="device-realtime-monitor__status">
        <span data-state={snapshot?.online ? 'online' : 'unknown'} />
        <strong>{snapshot?.online ? 'Online' : 'Offline / Unknown'}</strong>
        <p>
          This screen now reads from backend realtime cache. WebSocket/SSE streaming will be added in the next realtime task.
        </p>
      </div>

      <div className="device-realtime-monitor__grid">
        {metrics.map((metric) => (
          <article className="device-realtime-monitor__card" key={metric.label}>
            <p>{metric.label}</p>
            <strong>{metric.value}</strong>
            {metric.hint ? <span>{metric.hint}</span> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
