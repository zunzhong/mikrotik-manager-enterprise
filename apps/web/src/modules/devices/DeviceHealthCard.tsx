import type { HealthIssue, HealthReport } from './device-realtime.types';
import { healthStatusHint, healthStatusLabel } from './device-realtime.utils';
import './device-health-card.css';

export interface DeviceHealthCardProps {
  report?: HealthReport;
  online?: boolean;
}

export function DeviceHealthCard({ report, online }: DeviceHealthCardProps) {
  if (!report) {
    return (
      <section className="device-health-card" data-status="unknown">
        <div className="device-health-card__summary">
          <div>
            <p className="device-health-card__eyebrow">Health Engine</p>
            <h3>Health report unavailable</h3>
            <p>Refresh realtime data to calculate health score.</p>
          </div>
          <strong>N/A</strong>
        </div>
      </section>
    );
  }

  const status = online === false ? 'critical' : report.status;
  const issues = report.issues ?? [];

  return (
    <section className="device-health-card" data-status={status}>
      <div className="device-health-card__summary">
        <div>
          <p className="device-health-card__eyebrow">Health Engine</p>
          <h3>{healthStatusLabel(status)}</h3>
          <p>{online === false ? 'Device is offline or unreachable.' : healthStatusHint(status)}</p>
        </div>

        <strong>{report.score}</strong>
      </div>

      <div className="device-health-card__meter" aria-label={`Health score ${report.score}`}>
        <span style={{ width: `${Math.max(0, Math.min(100, report.score))}%` }} />
      </div>

      {issues.length > 0 ? (
        <div className="device-health-card__issues">
          <h4>Active Issues</h4>
          {issues.map((issue) => (
            <HealthIssueRow issue={issue} key={`${issue.code}-${issue.title}-${issue.value ?? ''}`} />
          ))}
        </div>
      ) : (
        <p className="device-health-card__healthy">No active health issues detected.</p>
      )}

      <footer>
        Evaluated at: {new Date(report.evaluatedAt).toLocaleString()}
      </footer>
    </section>
  );
}

function HealthIssueRow({ issue }: { issue: HealthIssue }) {
  return (
    <article className="device-health-card__issue" data-status={issue.status}>
      <div>
        <strong>{issue.title}</strong>
        <p>{issue.message}</p>
        {issue.recommendation ? <small>{issue.recommendation}</small> : null}
      </div>

      <span>
        {issue.value !== undefined ? issue.value : ''}
        {issue.unit ?? ''}
      </span>
    </article>
  );
}
