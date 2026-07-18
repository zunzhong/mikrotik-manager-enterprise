import type { DeviceRealtimeOverview } from '../../devices/device-realtime.types';
import type { DashboardSummary } from '../dashboard.api';
import { useLanguage } from '../../../i18n/LanguageContext';

function numeric(value: unknown): number {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

export function DashboardCharts({
  summary,
  realtime,
}: {
  summary?: DashboardSummary;
  realtime?: DeviceRealtimeOverview;
}) {
  const { tr } = useLanguage();
  const total = Math.max(1, summary?.devices.total ?? 0);
  const online = summary?.devices.online ?? 0;
  const offline = summary?.devices.offline ?? 0;
  const onlineDeg = (online / total) * 360;

  return (
    <section className="dashboard-charts">
      <article className="dashboard-chart-card">
        <div>
          <p className="device-dashboard__eyebrow">{tr('Trạng thái hệ thống', 'System status')}</p>
          <h3>{tr('Phân bố thiết bị', 'Device distribution')}</h3>
        </div>
        <div className="status-donut-wrap">
          <div
            className="status-donut"
            style={{
              background: `conic-gradient(#22c55e 0deg ${onlineDeg}deg, #ef4444 ${onlineDeg}deg 360deg)`,
            }}
          >
            <span>
              <strong>{summary?.devices.total ?? 0}</strong>
              <small>{tr('Tổng', 'Total')}</small>
            </span>
          </div>
          <div className="chart-legend">
            <span className="online">
              Online <strong>{online}</strong>
            </span>
            <span className="offline">
              Offline <strong>{offline}</strong>
            </span>
          </div>
        </div>
      </article>

      <article className="dashboard-chart-card">
        <div>
          <p className="device-dashboard__eyebrow">
            {tr('Tài nguyên realtime', 'Realtime resources')}
          </p>
          <h3>{tr('CPU theo thiết bị', 'CPU by device')}</h3>
        </div>
        <div className="device-cpu-bars">
          {(realtime?.devices ?? []).slice(0, 12).map((device) => {
            const cpu = Math.max(
              0,
              Math.min(100, numeric(device.resource?.['cpu-load'] ?? device.resource?.cpuLoad)),
            );
            return (
              <div key={device.deviceId}>
                <span title={device.deviceName}>{device.deviceName ?? device.deviceId}</span>
                <div>
                  <i
                    style={{ width: `${cpu}%` }}
                    data-level={cpu >= 85 ? 'critical' : cpu >= 70 ? 'warning' : 'normal'}
                  />
                </div>
                <strong>{cpu}%</strong>
              </div>
            );
          })}
          {(realtime?.devices.length ?? 0) === 0 ? (
            <p className="muted">{tr('Chưa có dữ liệu realtime.', 'No realtime data yet.')}</p>
          ) : null}
        </div>
      </article>
    </section>
  );
}
