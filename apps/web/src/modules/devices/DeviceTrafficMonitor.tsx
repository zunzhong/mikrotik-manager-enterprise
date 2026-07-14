import { useCallback, useEffect, useMemo, useState } from 'react';
import { deviceApi } from './device.api';
import type { DeviceTrafficHistory, TrafficPeriod } from './device-traffic.types';

const periodLabels: Record<TrafficPeriod, string> = {
  hour: 'Theo giờ',
  day: 'Theo ngày',
  month: 'Theo tháng',
  year: 'Theo năm',
};

function formatBytes(value: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let current = Math.max(0, value);
  let unit = 0;
  while (current >= 1024 && unit < units.length - 1) {
    current /= 1024;
    unit += 1;
  }
  return `${current >= 100 || unit === 0 ? current.toFixed(0) : current.toFixed(2)} ${units[unit]}`;
}

function formatRate(value: number): string {
  const units = ['bps', 'Kbps', 'Mbps', 'Gbps'];
  let current = Math.max(0, value);
  let unit = 0;
  while (current >= 1000 && unit < units.length - 1) {
    current /= 1000;
    unit += 1;
  }
  return `${current >= 10 || unit === 0 ? current.toFixed(0) : current.toFixed(1)} ${units[unit]}`;
}

export function DeviceTrafficMonitor({ deviceId }: { deviceId: string }) {
  const [period, setPeriod] = useState<TrafficPeriod>('hour');
  const [interfaceName, setInterfaceName] = useState('all');
  const [anchor, setAnchor] = useState(() => new Date().toISOString().slice(0, 10));
  const [history, setHistory] = useState<DeviceTrafficHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const result = await deviceApi.trafficHistory(deviceId, { period, interfaceName, anchor });
      setHistory(result);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải dữ liệu traffic.');
    } finally {
      setLoading(false);
    }
  }, [anchor, deviceId, interfaceName, period]);

  useEffect(() => {
    setLoading(true);
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  const max = useMemo(
    () =>
      Math.max(
        1,
        ...(history?.buckets.flatMap((bucket) => [bucket.rxBytes, bucket.txBytes]) ?? []),
      ),
    [history],
  );

  return (
    <section className="traffic-monitor">
      <header className="traffic-monitor__header">
        <div>
          <p className="device-dashboard__eyebrow">TRAFFIC DATABASE MONITOR</p>
          <h3>Giám sát lưu lượng Interface</h3>
          <p>Dữ liệu RX/TX được thu thập tự động, lưu trong database và tổng hợp theo thời gian.</p>
        </div>
        <span className="traffic-monitor__database">● DATABASE</span>
      </header>

      <div className="traffic-monitor__toolbar">
        <div className="traffic-period-tabs">
          {(Object.keys(periodLabels) as TrafficPeriod[]).map((value) => (
            <button
              type="button"
              className={period === value ? 'active' : ''}
              onClick={() => setPeriod(value)}
              key={value}
            >
              {periodLabels[value]}
            </button>
          ))}
        </div>
        <div className="traffic-monitor__filters">
          <select value={interfaceName} onChange={(event) => setInterfaceName(event.target.value)}>
            <option value="all">Tất cả Interface</option>
            {(history?.interfaces ?? []).map((name) => (
              <option value={name} key={name}>
                {name}
              </option>
            ))}
          </select>
          <input type="date" value={anchor} onChange={(event) => setAnchor(event.target.value)} />
          <button type="button" className="small-button" onClick={() => void load()}>
            Làm mới
          </button>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      <div className="traffic-monitor__summary">
        <article>
          <span>Tải xuống (RX)</span>
          <strong>{formatBytes(history?.totals.rxBytes ?? 0)}</strong>
        </article>
        <article>
          <span>Tải lên (TX)</span>
          <strong>{formatBytes(history?.totals.txBytes ?? 0)}</strong>
        </article>
        <article>
          <span>Tổng lưu lượng</span>
          <strong>{formatBytes(history?.totals.totalBytes ?? 0)}</strong>
        </article>
        <article>
          <span>Tốc độ hiện tại</span>
          <strong>
            {formatRate(history?.current?.rxBps ?? 0)} / {formatRate(history?.current?.txBps ?? 0)}
          </strong>
        </article>
      </div>

      <div className="traffic-bar-chart" aria-label="Biểu đồ traffic theo thời gian">
        {(history?.buckets ?? []).map((bucket) => (
          <div
            className="traffic-bar-chart__column"
            key={bucket.key}
            title={`${bucket.label}: RX ${formatBytes(bucket.rxBytes)}, TX ${formatBytes(bucket.txBytes)}`}
          >
            <div className="traffic-bar-chart__bars">
              <i
                className="rx"
                style={{
                  height: `${Math.max(bucket.rxBytes > 0 ? 3 : 0, (bucket.rxBytes / max) * 100)}%`,
                }}
              />
              <i
                className="tx"
                style={{
                  height: `${Math.max(bucket.txBytes > 0 ? 3 : 0, (bucket.txBytes / max) * 100)}%`,
                }}
              />
            </div>
            <span>{bucket.label}</span>
          </div>
        ))}
        {loading ? <div className="traffic-monitor__empty">Đang tải dữ liệu...</div> : null}
      </div>
      <div className="traffic-chart-legend">
        <span className="rx">RX / Download</span>
        <span className="tx">TX / Upload</span>
      </div>

      <div className="traffic-monitor__table-wrap">
        <table className="traffic-monitor__table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>RX / Download</th>
              <th>TX / Upload</th>
              <th>Tổng</th>
            </tr>
          </thead>
          <tbody>
            {[...(history?.buckets ?? [])].reverse().map((bucket) => (
              <tr key={bucket.key}>
                <td>{bucket.label}</td>
                <td>{formatBytes(bucket.rxBytes)}</td>
                <td>{formatBytes(bucket.txBytes)}</td>
                <td>{formatBytes(bucket.totalBytes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
