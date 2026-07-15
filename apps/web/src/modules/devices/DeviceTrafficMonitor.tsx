import { useCallback, useEffect, useMemo, useState } from 'react';
import { deviceApi } from './device.api';
import type { DeviceTrafficHistory, TrafficPeriod } from './device-traffic.types';
import { useLanguage } from '../../i18n/LanguageContext';

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

function currentDateInTimeZone(timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function DeviceTrafficMonitor({ deviceId }: { deviceId: string }) {
  const { language, timeZone, tr } = useLanguage();
  const [period, setPeriod] = useState<TrafficPeriod>('hour');
  const [interfaceName, setInterfaceName] = useState('all');
  const [anchor, setAnchor] = useState(() => currentDateInTimeZone(timeZone));
  const [history, setHistory] = useState<DeviceTrafficHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setAnchor(currentDateInTimeZone(timeZone));
  }, [timeZone]);

  const load = useCallback(async () => {
    try {
      const result = await deviceApi.trafficHistory(deviceId, { period, interfaceName, anchor });
      setHistory(result);
      setError('');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : tr('Không thể tải dữ liệu traffic.', 'Cannot load traffic data.'),
      );
    } finally {
      setLoading(false);
    }
  }, [anchor, deviceId, interfaceName, period, tr]);

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
  const axisTicks = useMemo(
    () => [1, 0.75, 0.5, 0.25, 0].map((ratio) => ({ ratio, label: formatBytes(max * ratio) })),
    [max],
  );

  return (
    <section className="traffic-monitor">
      <header className="traffic-monitor__header">
        <div>
          <p className="device-dashboard__eyebrow">TRAFFIC DATABASE MONITOR</p>
          <h3>{tr('Giám sát lưu lượng Interface', 'Interface Traffic Monitor')}</h3>
          <p>
            {tr(
              'Dữ liệu RX/TX được thu thập tự động, lưu trong database và tổng hợp theo thời gian.',
              'RX/TX data is collected automatically, stored in the database, and aggregated over time.',
            )}
          </p>
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
              {language === 'en'
                ? ({ hour: 'Hourly', day: 'Daily', month: 'Monthly', year: 'Yearly' } as const)[
                    value
                  ]
                : periodLabels[value]}
            </button>
          ))}
        </div>
        <div className="traffic-monitor__filters">
          <select value={interfaceName} onChange={(event) => setInterfaceName(event.target.value)}>
            <option value="all">{tr('Tất cả Interface', 'All interfaces')}</option>
            {(history?.interfaces ?? []).map((name) => (
              <option value={name} key={name}>
                {name}
              </option>
            ))}
          </select>
          <input type="date" value={anchor} onChange={(event) => setAnchor(event.target.value)} />
          <span className="muted">{history?.timeZone ?? timeZone}</span>
          <button type="button" className="small-button" onClick={() => void load()}>
            {tr('Làm mới', 'Refresh')}
          </button>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      <div className="traffic-monitor__summary">
        <article>
          <span>{tr('Tải xuống (RX)', 'Download (RX)')}</span>
          <strong>{formatBytes(history?.totals.rxBytes ?? 0)}</strong>
        </article>
        <article>
          <span>{tr('Tải lên (TX)', 'Upload (TX)')}</span>
          <strong>{formatBytes(history?.totals.txBytes ?? 0)}</strong>
        </article>
        <article>
          <span>{tr('Tổng lưu lượng', 'Total traffic')}</span>
          <strong>{formatBytes(history?.totals.totalBytes ?? 0)}</strong>
        </article>
        <article>
          <span>{tr('Tốc độ hiện tại', 'Current rate')}</span>
          <strong>
            {formatRate(history?.current?.rxBps ?? 0)} / {formatRate(history?.current?.txBps ?? 0)}
          </strong>
        </article>
      </div>

      <div className="traffic-chart-with-axis">
        <div className="traffic-y-axis" aria-label="Đơn vị lưu lượng">
          {axisTicks.map((tick) => (
            <span key={tick.ratio}>{tick.label}</span>
          ))}
          <b>{tr('Đơn vị', 'Unit')}</b>
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
          {loading ? (
            <div className="traffic-monitor__empty">
              {tr('Đang tải dữ liệu...', 'Loading traffic data...')}
            </div>
          ) : null}
        </div>
      </div>
      <div className="traffic-chart-legend">
        <span className="rx">RX / Download</span>
        <span className="tx">TX / Upload</span>
      </div>

      <div className="traffic-monitor__table-wrap">
        <table className="traffic-monitor__table">
          <thead>
            <tr>
              <th>{tr('Thời gian', 'Time')}</th>
              <th>RX / Download</th>
              <th>TX / Upload</th>
              <th>{tr('Tổng', 'Total')}</th>
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
