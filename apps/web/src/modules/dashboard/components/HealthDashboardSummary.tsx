import type { AppEvent, AppEventType } from '../../events/event.types';
import type { DeviceRealtimeOverview, DeviceRealtimeSnapshot, HealthStatus } from '../../devices/device-realtime.types';
import { SummaryCard } from './SummaryCard';
import { WidgetCard } from './WidgetCard';
import './health-dashboard-summary.css';

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

function healthStatusLabel(status: HealthStatus | 'unknown'): string {
  if (status === 'healthy') return 'Healthy';
  if (status === 'warning') return 'Warning';
  if (status === 'critical') return 'Critical';
  return 'Unknown';
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
  return events
    .filter((event) => healthEventTypes.has(event.type))
    .slice(0, 8);
}

export function HealthDashboardSummary({
  overview,
  events = [],
  loading = false,
  error,
  onRefresh,
}: HealthDashboardSummaryProps) {
  const devices = overview?.devices ?? [];
  const summary = buildSummary(devices);
  const averageScore = summary.scored > 0 ? Math.round(summary.totalScore / summary.scored) : 0;
  const healthEvents = recentHealthEvents(events);

  return (
    <section className="health-dashboard-summary">
      <div className="health-dashboard-summary__header">
        <div>
          <p className="health-dashboard-summary__eyebrow">Health Engine</p>
          <h3>Realtime Health Summary</h3>
          <p>
            Calculated from cached realtime snapshots and health events published by the realtime
            engine.
          </p>
        </div>

        {onRefresh ? (
          <button className="small-button" type="button" onClick={onRefresh}>
            Refresh Health
          </button>
        ) : null}
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="health-dashboard-summary__cards">
        <SummaryCard label="Healthy Devices" value={summary.healthy} hint="no active issues" />
        <SummaryCard label="Warning Devices" value={summary.warning} hint="needs review" />
        <SummaryCard label="Critical Devices" value={summary.critical} hint="needs action" />
        <SummaryCard
          label="Average Health"
          value={summary.scored > 0 ? `${averageScore}%` : 'N/A'}
          hint={`${summary.scored}/${devices.length} devices scored`}
        />
      </div>

      <div className="health-dashboard-summary__grid">
        <WidgetCard title="Device Health" description="Cached realtime health state">
          <div className="health-dashboard-summary__device-list">
            {devices.slice(0, 8).map((device) => {
              const status = statusForSnapshot(device);
              const score = scoreForSnapshot(device);

              return (
                <div className="health-dashboard-summary__row" data-status={status} key={device.deviceId}>
                  <div>
                    <strong>{device.deviceId}</strong>
                    <small>
                      {healthStatusLabel(status)} · {device.online ? 'Online' : 'Offline'}
                    </small>
                  </div>

                  <span>{score === null ? 'N/A' : score}</span>
                </div>
              );
            })}

            {!loading && devices.length === 0 ? (
              <p className="muted">No realtime health snapshots yet. Start scheduler or refresh devices.</p>
            ) : null}

            {loading ? <p className="muted">Loading health summary...</p> : null}
          </div>
        </WidgetCard>

        <WidgetCard title="Recent Health Events" description="Realtime health and device events">
          <div className="health-dashboard-summary__event-list">
            {healthEvents.map((event) => (
              <div className="health-dashboard-summary__row" data-status={event.severity} key={event.id}>
                <div>
                  <strong>{event.title}</strong>
                  <small>
                    {event.deviceName ?? event.deviceId ?? 'System'} · {new Date(event.createdAt).toLocaleString()}
                  </small>
                </div>

                <span>{event.severity}</span>
              </div>
            ))}

            {!loading && healthEvents.length === 0 ? (
              <p className="muted">No health events yet.</p>
            ) : null}

            {loading ? <p className="muted">Loading health events...</p> : null}
          </div>
        </WidgetCard>
      </div>
    </section>
  );
}
