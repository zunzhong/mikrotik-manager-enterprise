import type { DeviceRealtimeOverview } from '../../devices/device-realtime.types';
import type { DashboardSummary } from '../dashboard.api';

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
  const total = Math.max(1, summary?.devices.total ?? 0);
  const online = summary?.devices.online ?? 0;
  const degraded = summary?.devices.degraded ?? 0;
  const offline = summary?.devices.offline ?? 0;
  const onlineDeg = (online / total) * 360;
  const degradedDeg = onlineDeg + (degraded / total) * 360;

  return (
    <section className="dashboard-charts">
      <article className="dashboard-chart-card">
        <div>
          <p className="device-dashboard__eyebrow">Trạng thái hệ thống</p>
          <h3>Phân bố thiết bị</h3>
        </div>
        <div className="status-donut-wrap">
          <div
            className="status-donut"
            style={{
              background: `conic-gradient(#22c55e 0deg ${onlineDeg}deg, #f59e0b ${onlineDeg}deg ${degradedDeg}deg, #ef4444 ${degradedDeg}deg 360deg)`,
            }}
          >
            <span>
              <strong>{summary?.devices.total ?? 0}</strong>
              <small>Tổng</small>
            </span>
          </div>
          <div className="chart-legend">
            <span className="online">
              Online <strong>{online}</strong>
            </span>
            <span className="warning">
              Cảnh báo <strong>{degraded}</strong>
            </span>
            <span className="offline">
              Offline <strong>{offline}</strong>
            </span>
          </div>
        </div>
      </article>

      <article className="dashboard-chart-card">
        <div>
          <p className="device-dashboard__eyebrow">Tài nguyên realtime</p>
          <h3>CPU theo thiết bị</h3>
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
            <p className="muted">Chưa có dữ liệu realtime.</p>
          ) : null}
        </div>
      </article>
    </section>
  );
}
