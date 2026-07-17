import type { AppEvent, AppEventType } from '../../events/event.types';
import type {
  DeviceRealtimeOverview,
  DeviceRealtimeSnapshot,
  HealthStatus,
} from '../../devices/device-realtime.types';
import { SummaryCard } from './SummaryCard';
import { WidgetCard } from './WidgetCard';
import './health-dashboard-summary.css';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../../i18n/LanguageContext';

export interface HealthDashboardSummaryProps {
  overview?: DeviceRealtimeOverview;
  events?: AppEvent[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

const healthEventTypes = new Set<AppEventType>([
  'CPU_HIGH',
  'MEMORY_LOW',
  'DISK_LOW',
  'TEMPERATURE_HIGH',
  'DEVICE_WARNING',
  'DEVICE_CRITICAL',
  'DEVICE_OFFLINE',
]);

function statusForSnapshot(snapshot: DeviceRealtimeSnapshot): HealthStatus | 'unknown' {
  if (!snapshot.online) return 'critical';
  return snapshot.healthReport?.status ?? 'unknown';
}

function scoreForSnapshot(snapshot: DeviceRealtimeSnapshot): number | null {
  if (!snapshot.online) return 0;
  return typeof snapshot.healthReport?.score === 'number' ? snapshot.healthReport.score : null;
}

function healthStatusLabel(
  status: HealthStatus | 'unknown',
  tr: (vi: string, en: string) => string,
): string {
  if (status === 'healthy') return tr('Khỏe mạnh', 'Healthy');
  if (status === 'warning') return tr('Cảnh báo', 'Warning');
  if (status === 'critical') return tr('Nghiêm trọng', 'Critical');
  return tr('Không xác định', 'Unknown');
}

function buildSummary(devices: DeviceRealtimeSnapshot[]) {
  const initial = {
    healthy: 0,
    warning: 0,
    critical: 0,
    unknown: 0,
    scored: 0,
    totalScore: 0,
  };

  return devices.reduce((summary, snapshot) => {
    const status = statusForSnapshot(snapshot);
    summary[status] += 1;

    const score = scoreForSnapshot(snapshot);
    if (score !== null) {
      summary.scored += 1;
      summary.totalScore += score;
    }

    return summary;
  }, initial);
}

function recentHealthEvents(events: AppEvent[]): AppEvent[] {
  return events.filter((event) => healthEventTypes.has(event.type)).slice(0, 8);
}

function metricText(event: AppEvent): string | null {
  const value = event.metadata?.value;
  const threshold = event.metadata?.threshold;
  const unit = typeof event.metadata?.unit === 'string' ? event.metadata.unit : '';
  if (value === undefined) return event.message || null;
  return `Thực tế ${String(value)}${unit} · Ngưỡng ${threshold === undefined ? 'N/A' : String(threshold)}${unit}`;
}

function resourceValue(resource: Record<string, unknown> | undefined, ...keys: string[]): string {
  for (const key of keys) {
    const value = resource?.[key];
    if (value !== undefined && value !== null) return String(value);
  }
  return 'N/A';
}

export function HealthDashboardSummary({
  overview,
  events = [],
  loading = false,
  error,
  onRefresh,
}: HealthDashboardSummaryProps) {
  const { formatDateTime, tr } = useLanguage();
  const devices = overview?.devices ?? [];
  const summary = buildSummary(devices);
  const averageScore = summary.scored > 0 ? Math.round(summary.totalScore / summary.scored) : 0;
  const healthEvents = recentHealthEvents(events);

  return (
    <section className="health-dashboard-summary">
      <div className="health-dashboard-summary__header">
        <div>
          <p className="health-dashboard-summary__eyebrow">
            {tr('Bộ máy sức khỏe', 'Health Engine')}
          </p>
          <h3>{tr('Tổng quan sức khỏe thời gian thực', 'Realtime Health Summary')}</h3>
          <p>
            {tr(
              'Tính từ dữ liệu thời gian thực và các sự kiện sức khỏe của thiết bị.',
              'Calculated from realtime snapshots and device health events.',
            )}
          </p>
        </div>

        {onRefresh ? (
          <button className="small-button" type="button" onClick={onRefresh}>
            {tr('Làm mới sức khỏe', 'Refresh Health')}
          </button>
        ) : null}
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="health-dashboard-summary__cards">
        <SummaryCard
          label={tr('Thiết bị khỏe mạnh', 'Healthy Devices')}
          value={summary.healthy}
          hint={tr('không có vấn đề', 'no active issues')}
        />
        <SummaryCard
          label={tr('Thiết bị cảnh báo', 'Warning Devices')}
          value={summary.warning}
          hint={tr('cần kiểm tra', 'needs review')}
        />
        <SummaryCard
          label={tr('Thiết bị nghiêm trọng', 'Critical Devices')}
          value={summary.critical}
          hint={tr('cần xử lý', 'needs action')}
        />
        <SummaryCard
          label={tr('Sức khỏe trung bình', 'Average Health')}
          value={summary.scored > 0 ? `${averageScore}%` : 'N/A'}
          hint={tr(
            `${summary.scored}/${devices.length} thiết bị đã chấm điểm`,
            `${summary.scored}/${devices.length} devices scored`,
          )}
        />
      </div>

      <div className="health-dashboard-summary__grid">
        <WidgetCard
          title={tr('Sức khỏe thiết bị', 'Device Health')}
          description={tr('Trạng thái sức khỏe thời gian thực', 'Realtime health state')}
        >
          <div className="health-dashboard-summary__device-list">
            {devices.slice(0, 8).map((device) => {
              const status = statusForSnapshot(device);
              const score = scoreForSnapshot(device);

              return (
                <Link
                  className="health-dashboard-summary__row"
                  data-status={status}
                  key={device.deviceId}
                  to={`/devices/${device.deviceId}?tab=overview&focus=health`}
                >
                  <div>
                    <strong>{device.deviceName ?? device.deviceId}</strong>
                    <small>
                      {healthStatusLabel(status, tr)} ·{' '}
                      {device.online ? tr('Trực tuyến', 'Online') : tr('Ngoại tuyến', 'Offline')}
                    </small>
                    <small className="health-dashboard-summary__metrics">
                      CPU {resourceValue(device.resource, 'cpuLoad', 'cpu-load')}% · RAM trống{' '}
                      {resourceValue(device.resource, 'freeMemory', 'free-memory')} · Disk trống{' '}
                      {resourceValue(device.resource, 'freeHddSpace', 'free-hdd-space')}
                    </small>
                  </div>

                  <span>{score === null ? 'N/A' : score}</span>
                </Link>
              );
            })}

            {!loading && devices.length === 0 ? (
              <p className="muted">
                {tr(
                  'Chưa có dữ liệu sức khỏe thời gian thực.',
                  'No realtime health snapshots yet.',
                )}
              </p>
            ) : null}

            {loading ? (
              <p className="muted">
                {tr('Đang tải tổng quan sức khỏe...', 'Loading health summary...')}
              </p>
            ) : null}
          </div>
        </WidgetCard>

        <WidgetCard
          title={tr('Sự kiện sức khỏe gần đây', 'Recent Health Events')}
          description={tr(
            'Sự kiện sức khỏe và thiết bị thời gian thực',
            'Realtime health and device events',
          )}
        >
          <div className="health-dashboard-summary__event-list">
            {healthEvents.map((event) => (
              <Link
                className="health-dashboard-summary__row"
                data-status={event.severity}
                key={event.id}
                to={
                  event.deviceId
                    ? `/devices/${event.deviceId}?tab=alerts&focus=${event.id}`
                    : '/alerts'
                }
              >
                <div>
                  <strong>{event.title}</strong>
                  <small className="health-dashboard-summary__event-message">
                    {metricText(event)}
                  </small>
                  <small>
                    {event.deviceName ?? event.deviceId ?? tr('Hệ thống', 'System')} ·{' '}
                    {formatDateTime(event.createdAt)}
                  </small>
                </div>

                <span>{event.severity}</span>
              </Link>
            ))}

            {!loading && healthEvents.length === 0 ? (
              <p className="muted">{tr('Chưa có sự kiện sức khỏe.', 'No health events yet.')}</p>
            ) : null}

            {loading ? (
              <p className="muted">
                {tr('Đang tải sự kiện sức khỏe...', 'Loading health events...')}
              </p>
            ) : null}
          </div>
        </WidgetCard>
      </div>
    </section>
  );
}
