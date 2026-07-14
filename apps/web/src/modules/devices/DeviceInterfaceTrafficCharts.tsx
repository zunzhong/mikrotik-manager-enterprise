import { useEffect, useMemo, useRef, useState } from 'react';
import { deviceApi } from './device.api';

interface TrafficPoint {
  at: number;
  rx: number;
  tx: number;
}
interface Counter {
  at: number;
  rx: number;
  tx: number;
}

function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatRate(value: number): string {
  const units = ['bps', 'Kbps', 'Mbps', 'Gbps'];
  let current = value;
  let unit = 0;
  while (current >= 1000 && unit < units.length - 1) {
    current /= 1000;
    unit += 1;
  }
  return `${current >= 10 || unit === 0 ? current.toFixed(0) : current.toFixed(1)} ${units[unit]}`;
}

function points(values: number[], max: number): string {
  const width = 320;
  const height = 92;
  return values
    .map((value, index) => {
      const x = values.length <= 1 ? 0 : (index / (values.length - 1)) * width;
      const y = height - (value / Math.max(1, max)) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function DeviceInterfaceTrafficCharts({ deviceId }: { deviceId: string }) {
  const previous = useRef(new Map<string, Counter>());
  const [series, setSeries] = useState<Record<string, TrafficPoint[]>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function collect() {
      try {
        const snapshot = await deviceApi.getRealtimeSnapshot(deviceId);
        const now = Date.now();
        const next: Record<string, TrafficPoint> = {};
        for (const [index, raw] of (snapshot.interfaces ?? []).entries()) {
          const name = String(raw.name ?? `interface-${index + 1}`);
          const rx = numberValue(raw['rx-byte'] ?? raw.rxByte);
          const tx = numberValue(raw['tx-byte'] ?? raw.txByte);
          const old = previous.current.get(name);
          previous.current.set(name, { at: now, rx, tx });
          const seconds = old ? Math.max(0.001, (now - old.at) / 1000) : 1;
          next[name] = {
            at: now,
            rx: old && rx >= old.rx ? ((rx - old.rx) * 8) / seconds : 0,
            tx: old && tx >= old.tx ? ((tx - old.tx) * 8) / seconds : 0,
          };
        }
        if (!active) return;
        setSeries((current) => {
          const updated = { ...current };
          for (const [name, point] of Object.entries(next)) {
            updated[name] = [...(updated[name] ?? []), point].slice(-30);
          }
          return updated;
        });
        setError('');
      } catch (reason) {
        if (active)
          setError(reason instanceof Error ? reason.message : 'Không thể thu thập traffic.');
      }
    }
    void collect();
    const timer = window.setInterval(() => void collect(), 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [deviceId]);

  const entries = useMemo(
    () =>
      Object.entries(series).sort(([, a], [, b]) => {
        const lastA = a.at(-1);
        const lastB = b.at(-1);
        return (lastB?.rx ?? 0) + (lastB?.tx ?? 0) - ((lastA?.rx ?? 0) + (lastA?.tx ?? 0));
      }),
    [series],
  );

  return (
    <section className="interface-traffic-charts">
      <header>
        <div>
          <p className="device-dashboard__eyebrow">Traffic realtime</p>
          <h3>Lưu lượng theo Interface</h3>
          <p>RX/TX tính từ chênh lệch counter RouterOS, cập nhật 5 giây/lần.</p>
        </div>
        <span className="live-indicator">LIVE</span>
      </header>
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="interface-traffic-grid">
        {entries.slice(0, 12).map(([name, samples]) => {
          const latest = samples.at(-1) ?? { rx: 0, tx: 0, at: 0 };
          const max = Math.max(1, ...samples.flatMap((sample) => [sample.rx, sample.tx]));
          return (
            <article key={name} className="traffic-chart-card">
              <div className="traffic-chart-title">
                <strong>{name}</strong>
                <span>
                  RX {formatRate(latest.rx)} · TX {formatRate(latest.tx)}
                </span>
              </div>
              <svg
                viewBox="0 0 320 100"
                role="img"
                aria-label={`Traffic ${name}`}
                preserveAspectRatio="none"
              >
                <line x1="0" y1="96" x2="320" y2="96" />
                <polyline
                  className="traffic-rx"
                  points={points(
                    samples.map((sample) => sample.rx),
                    max,
                  )}
                />
                <polyline
                  className="traffic-tx"
                  points={points(
                    samples.map((sample) => sample.tx),
                    max,
                  )}
                />
              </svg>
              <div className="traffic-legend">
                <span className="rx">RX</span>
                <span className="tx">TX</span>
              </div>
            </article>
          );
        })}
      </div>
      {entries.length === 0 ? (
        <p className="muted">Đang chờ counter traffic từ RouterOS...</p>
      ) : null}
    </section>
  );
}
