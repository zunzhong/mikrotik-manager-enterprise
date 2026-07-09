import { useEffect, useMemo, useState } from 'react';
import { deviceApi } from './device.api';
import { DeviceHealthCard } from './DeviceHealthCard';
import type {
  DeviceRealtimeSchedulerStatus,
  DeviceRealtimeSnapshot,
  DeviceRealtimeStreamState,
} from './device-realtime.types';
import {
  buildRealtimeMetrics,
  cacheAge,
  schedulerLabel,
  snapshotAge,
} from './device-realtime.utils';

export interface DeviceRealtimeMonitorProps {
  deviceId: string;
}

const refreshOptions = [5000, 10000, 30000];

function parseEventData<T>(event: MessageEvent<string>): T | null {
  try {
    return JSON.parse(event.data) as T;
  } catch {
    return null;
  }
}

export function DeviceRealtimeMonitor({ deviceId }: DeviceRealtimeMonitorProps) {
  const [snapshot, setSnapshot] = useState<DeviceRealtimeSnapshot | null>(null);
  const [scheduler, setScheduler] = useState<DeviceRealtimeSchedulerStatus | null>(null);
  const [refreshMs, setRefreshMs] = useState(5000);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [stream, setStream] = useState<DeviceRealtimeStreamState>({
    enabled: true,
    connected: false,
  });
  const [loading, setLoading] = useState(true);
  const [schedulerBusy, setSchedulerBusy] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);

    try {
      const [latest, schedulerStatus] = await Promise.all([
        deviceApi.getRealtimeSnapshot(deviceId),
        deviceApi.getRealtimeSchedulerStatus(),
      ]);
      setSnapshot(latest);
      setScheduler(schedulerStatus);
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
      const schedulerStatus = await deviceApi.getRealtimeSchedulerStatus();
      setSnapshot(latest);
      setScheduler(schedulerStatus);
      setLastLoadedAt(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot refresh realtime data');
    } finally {
      setLoading(false);
    }
  }

  async function startScheduler() {
    setSchedulerBusy(true);
    setError(null);

    try {
      setScheduler(
        await deviceApi.startRealtimeScheduler({ intervalMs: refreshMs, ttlMs: refreshMs * 2 }),
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot start scheduler');
    } finally {
      setSchedulerBusy(false);
    }
  }

  async function stopScheduler() {
    setSchedulerBusy(true);
    setError(null);

    try {
      setScheduler(await deviceApi.stopRealtimeScheduler());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot stop scheduler');
    } finally {
      setSchedulerBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, [deviceId]);

  useEffect(() => {
    if (!stream.enabled) {
      setStream((current) => ({ ...current, connected: false }));
      return undefined;
    }

    const source = new EventSource(deviceApi.realtimeStreamUrl(deviceId));

    source.addEventListener('open', () => {
      setStream({
        enabled: true,
        connected: true,
        lastEventAt: new Date().toLocaleTimeString(),
      });
    });

    source.addEventListener('snapshot', (event) => {
      const data = parseEventData<DeviceRealtimeSnapshot>(event as MessageEvent<string>);
      if (!data) return;

      setSnapshot(data);
      setLastLoadedAt(new Date().toLocaleTimeString());
      setLoading(false);
      setStream({
        enabled: true,
        connected: true,
        lastEventAt: new Date().toLocaleTimeString(),
      });
    });

    source.addEventListener('scheduler', (event) => {
      const data = parseEventData<DeviceRealtimeSchedulerStatus>(event as MessageEvent<string>);
      if (!data) return;

      setScheduler(data);
      setStream((current) => ({
        ...current,
        connected: true,
        lastEventAt: new Date().toLocaleTimeString(),
      }));
    });

    source.addEventListener('error', (event) => {
      const data = parseEventData<{ message?: string }>(event as MessageEvent<string>);
      setStream((current) => ({
        ...current,
        connected: false,
        error: data?.message ?? 'Realtime stream disconnected',
      }));
    });

    source.onerror = () => {
      setStream((current) => ({
        ...current,
        connected: false,
        error: 'Realtime stream disconnected',
      }));
    };

    return () => {
      source.close();
    };
  }, [deviceId, stream.enabled]);

  useEffect(() => {
    if (stream.enabled || !autoRefresh) return undefined;

    const timer = window.setInterval(() => {
      void load();
    }, refreshMs);

    return () => window.clearInterval(timer);
  }, [autoRefresh, deviceId, refreshMs, stream.enabled]);

  const metrics = useMemo(() => buildRealtimeMetrics(snapshot), [snapshot]);
  const lastEvent = stream.lastEventAt ?? lastLoadedAt ?? 'N/A';
  return (
    <section className="device-realtime-monitor">
      <header className="device-realtime-monitor__header">
        <div>
          <p className="device-realtime-monitor__eyebrow">Realtime Monitor</p>
          <h3>SSE Live Stream</h3>
          <p className="device-realtime-monitor__muted">
            Stream: {stream.connected ? 'Connected' : 'Disconnected'} · Scheduler:{' '}
            {schedulerLabel(scheduler)} · Cache age: {cacheAge(snapshot)} · Last event: {lastEvent}
          </p>
        </div>

        <div className="device-realtime-monitor__actions">
          <label>
            <input
              checked={stream.enabled}
              onChange={(event) =>
                setStream((current) => ({
                  ...current,
                  enabled: event.target.checked,
                  connected: false,
                  error: undefined,
                }))
              }
              type="checkbox"
            />
            SSE stream
          </label>

          <label>
            <input
              checked={autoRefresh}
              onChange={(event) => setAutoRefresh(event.target.checked)}
              type="checkbox"
              disabled={stream.enabled}
            />
            Poll fallback
          </label>

          <select value={refreshMs} onChange={(event) => setRefreshMs(Number(event.target.value))}>
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

          {scheduler?.running ? (
            <button type="button" onClick={() => void stopScheduler()} disabled={schedulerBusy}>
              Stop Scheduler
            </button>
          ) : (
            <button type="button" onClick={() => void startScheduler()} disabled={schedulerBusy}>
              Start Scheduler
            </button>
          )}
        </div>
      </header>

      {error ? <div className="device-realtime-monitor__error">{error}</div> : null}
      {stream.error ? <div className="device-realtime-monitor__error">{stream.error}</div> : null}

      <div className="device-realtime-monitor__status">
        <span data-state={snapshot?.online ? 'online' : 'unknown'} />
        <strong>{snapshot?.online ? 'Online' : 'Offline / Unknown'}</strong>
        <p>
          Last poll: {snapshot?.cache?.lastPollAt ? snapshotAge(snapshot) : 'N/A'} · Next scheduler
          poll: {scheduler?.nextRunAt ?? snapshot?.cache?.nextPollAt ?? 'N/A'} · Devices in
          scheduler: {scheduler?.deviceCount ?? 0}
        </p>
      </div>

      <DeviceHealthCard report={snapshot?.healthReport} online={snapshot?.online} />

      {scheduler?.lastError ? (
        <div className="device-realtime-monitor__error">{scheduler.lastError}</div>
      ) : null}

      <div className="device-realtime-monitor__grid">
        {metrics.map((metric) => (
          <article className="device-realtime-monitor__card" key={metric.label}>
            <p>{metric.label}</p>
            <strong>{metric.value}</strong>
            {metric.hint ? <span>{metric.hint}</span> : null}
          </article>
        ))}

        <article className="device-realtime-monitor__card">
          <p>Scheduler Interval</p>
          <strong>{scheduler ? `${scheduler.intervalMs / 1000}s` : 'N/A'}</strong>
          <span>Backend polling cadence</span>
        </article>

        <article className="device-realtime-monitor__card">
          <p>Last Poll Duration</p>
          <strong>
            {scheduler?.lastRunDurationMs ? `${scheduler.lastRunDurationMs}ms` : 'N/A'}
          </strong>
          <span>{scheduler?.inFlight ? 'Polling in progress' : 'Latest scheduler run'}</span>
        </article>

        <article className="device-realtime-monitor__card">
          <p>Stream Status</p>
          <strong>{stream.connected ? 'Live' : 'Fallback'}</strong>
          <span>{stream.enabled ? 'Server-Sent Events enabled' : 'Polling fallback enabled'}</span>
        </article>
      </div>
    </section>
  );
}
