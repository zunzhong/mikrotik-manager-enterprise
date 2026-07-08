import { useEffect, useMemo, useState } from 'react';
import { SummaryCard } from '../dashboard/components/SummaryCard';
import { WidgetCard } from '../dashboard/components/WidgetCard';
import { auditApi } from './audit.api';
import type {
  AuditEntityType,
  AuditEvent,
  AuditQueryInput,
  AuditSeverity,
  AuditStatus,
  AuditSummary,
} from './audit.types';
import './audit-log.css';

const statusOptions: Array<AuditStatus | 'all'> = ['all', 'success', 'failure'];
const severityOptions: Array<AuditSeverity | 'all'> = ['all', 'info', 'warning', 'critical'];
const entityOptions: Array<AuditEntityType | 'all'> = [
  'all',
  'system',
  'device',
  'event',
  'alert',
  'notification_channel',
  'notification_rule',
  'notification_delivery',
  'auth',
  'config',
];

function formatTime(value: string): string {
  return new Date(value).toLocaleString();
}

function metadataPreview(event: AuditEvent): string {
  if (!event.metadata) {
    return 'No metadata';
  }

  const text = JSON.stringify(event.metadata);

  return text.length > 140 ? `${text.slice(0, 140)}...` : text;
}

function actorLabel(event: AuditEvent): string {
  return event.actor.name ?? event.actor.id ?? event.actor.type;
}

function entityLabel(event: AuditEvent): string {
  if (!event.entity) {
    return 'N/A';
  }

  return event.entity.name ?? event.entity.id ?? event.entity.type;
}

export function AuditLogPanel() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [status, setStatus] = useState<AuditStatus | 'all'>('all');
  const [severity, setSeverity] = useState<AuditSeverity | 'all'>('all');
  const [entityType, setEntityType] = useState<AuditEntityType | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo<AuditQueryInput>(() => ({
    limit: 50,
    status: status === 'all' ? undefined : status,
    severity: severity === 'all' ? undefined : severity,
    entityType: entityType === 'all' ? undefined : entityType,
  }), [entityType, severity, status]);

  async function refresh() {
    setLoading(true);
    setError(null);

    try {
      const [nextSummary, nextEvents] = await Promise.all([
        auditApi.summary(query),
        auditApi.list(query),
      ]);

      setSummary(nextSummary);
      setEvents(nextEvents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot load audit logs');
    } finally {
      setLoading(false);
    }
  }

  async function seedDemo() {
    setBusy(true);
    setError(null);

    try {
      await auditApi.seedDemo();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot seed demo audit events');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [query]);

  return (
    <section className="audit-log-panel">
      <div className="audit-log-panel__header">
        <div>
          <p className="audit-log-panel__eyebrow">Audit Log Engine</p>
          <h3>Activity Trail</h3>
          <p>Track user, API, system, and notification management actions.</p>
        </div>

        <div className="audit-log-panel__actions">
          <button type="button" disabled={loading || busy} onClick={() => void refresh()}>
            Refresh
          </button>
          <button type="button" disabled={loading || busy} onClick={() => void seedDemo()}>
            Seed Demo
          </button>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="audit-log-panel__cards">
        <SummaryCard label="Audit Events" value={summary?.total ?? events.length} hint="matching filter" />
        <SummaryCard label="Success" value={summary?.success ?? 0} hint="successful actions" />
        <SummaryCard label="Failures" value={summary?.failure ?? 0} hint="failed actions" />
        <SummaryCard label="Critical" value={summary?.critical ?? 0} hint="critical severity" />
      </div>

      <WidgetCard title="Audit Filters" description="Filter the activity trail by status, severity, and entity type">
        <div className="audit-log-panel__filters">
          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value as AuditStatus | 'all')}>
              {statusOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            Severity
            <select value={severity} onChange={(event) => setSeverity(event.target.value as AuditSeverity | 'all')}>
              {severityOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            Entity
            <select value={entityType} onChange={(event) => setEntityType(event.target.value as AuditEntityType | 'all')}>
              {entityOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
      </WidgetCard>

      <WidgetCard title="Recent Audit Events" description={`Showing ${events.length} audit event(s)`}>
        <div className="audit-log-panel__list">
          {events.map((event) => (
            <article className="audit-log-panel__event" data-status={event.status} data-severity={event.severity} key={event.id}>
              <div className="audit-log-panel__event-main">
                <div>
                  <strong>{event.summary}</strong>
                  <small>
                    {event.action} · {actorLabel(event)} · {entityLabel(event)}
                  </small>
                  <small>{metadataPreview(event)}</small>
                </div>

                <div className="audit-log-panel__badges">
                  <span>{event.status}</span>
                  <span>{event.severity}</span>
                </div>
              </div>

              <small>{formatTime(event.createdAt)}</small>
            </article>
          ))}

          {!loading && events.length === 0 ? (
            <p className="muted">No audit events found for the current filter.</p>
          ) : null}

          {loading ? <p className="muted">Loading audit events...</p> : null}
        </div>
      </WidgetCard>
    </section>
  );
}
