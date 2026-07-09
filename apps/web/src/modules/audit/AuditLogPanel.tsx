import { useEffect, useMemo, useState } from 'react';
import { SummaryCard } from '../dashboard/components/SummaryCard';
import { WidgetCard } from '../dashboard/components/WidgetCard';
import { auditApi } from './audit.api';
import type {
  AuditEntityType,
  AuditEvent,
  AuditPageResult,
  AuditQueryInput,
  AuditRetentionResult,
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
const pageSizeOptions = [10, 25, 50, 100];

function formatTime(value: string): string {
  return new Date(value).toLocaleString();
}

function metadataPreview(event: AuditEvent): string {
  if (!event.metadata) return 'No metadata';
  const text = JSON.stringify(event.metadata);
  return text.length > 140 ? `${text.slice(0, 140)}...` : text;
}

function actorLabel(event: AuditEvent): string {
  return event.actor.name ?? event.actor.id ?? event.actor.type;
}

function entityLabel(event: AuditEvent): string {
  if (!event.entity) return 'N/A';
  return event.entity.name ?? event.entity.id ?? event.entity.type;
}

function emptyPage(page: number, pageSize: number): AuditPageResult {
  return {
    items: [],
    total: 0,
    page,
    pageSize,
    totalPages: 0,
    generatedAt: new Date().toISOString(),
  };
}

function triggerDownload(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function AuditLogPanel() {
  const [pageResult, setPageResult] = useState<AuditPageResult>(() => emptyPage(1, 25));
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [status, setStatus] = useState<AuditStatus | 'all'>('all');
  const [severity, setSeverity] = useState<AuditSeverity | 'all'>('all');
  const [entityType, setEntityType] = useState<AuditEntityType | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [retentionDays, setRetentionDays] = useState(90);
  const [retentionResult, setRetentionResult] = useState<AuditRetentionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [retentionBusy, setRetentionBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterQuery = useMemo<AuditQueryInput>(() => ({
    status: status === 'all' ? undefined : status,
    severity: severity === 'all' ? undefined : severity,
    entityType: entityType === 'all' ? undefined : entityType,
  }), [entityType, severity, status]);

  const exportQuery = useMemo<AuditQueryInput>(() => ({
    ...filterQuery,
    limit: 1000,
  }), [filterQuery]);

  const pageQuery = useMemo<AuditQueryInput>(() => ({
    ...filterQuery,
    page,
    pageSize,
  }), [filterQuery, page, pageSize]);

  const events = pageResult.items;
  const totalPages = Math.max(pageResult.totalPages, 1);
  const canPrevious = pageResult.page > 1;
  const canNext = pageResult.page < totalPages;

  async function refresh() {
    setLoading(true);
    setError(null);

    try {
      const [nextSummary, nextPage] = await Promise.all([
        auditApi.summary(filterQuery),
        auditApi.page(pageQuery),
      ]);

      setSummary(nextSummary);
      setPageResult(nextPage);
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
      setPage(1);
      const nextPageQuery = { ...filterQuery, page: 1, pageSize };
      const [nextSummary, nextPage] = await Promise.all([
        auditApi.summary(filterQuery),
        auditApi.page(nextPageQuery),
      ]);

      setSummary(nextSummary);
      setPageResult(nextPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot seed demo audit events');
    } finally {
      setBusy(false);
    }
  }

  async function runRetention(dryRun: boolean) {
    const safeDays = Math.max(1, Math.min(3650, retentionDays || 1));

    if (!dryRun) {
      const confirmed = window.confirm(
        `Delete audit logs older than ${safeDays} day(s)? This action cannot be undone.`,
      );

      if (!confirmed) return;
    }

    setRetentionBusy(true);
    setError(null);

    try {
      const result = await auditApi.pruneRetention({ days: safeDays, dryRun });
      setRetentionResult(result);

      if (!dryRun) {
        setPage(1);
        await refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot run audit retention');
    } finally {
      setRetentionBusy(false);
    }
  }

  function exportAudit(format: 'json' | 'csv') {
    triggerDownload(auditApi.exportUrl(format, exportQuery));
  }

  function updateStatus(value: AuditStatus | 'all') {
    setStatus(value);
    setPage(1);
  }

  function updateSeverity(value: AuditSeverity | 'all') {
    setSeverity(value);
    setPage(1);
  }

  function updateEntityType(value: AuditEntityType | 'all') {
    setEntityType(value);
    setPage(1);
  }

  function updatePageSize(value: number) {
    setPageSize(value);
    setPage(1);
  }

  useEffect(() => {
    void refresh();
  }, [pageQuery]);

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
          <button type="button" disabled={loading || busy} onClick={() => exportAudit('json')}>
            Export JSON
          </button>
          <button type="button" disabled={loading || busy} onClick={() => exportAudit('csv')}>
            Export CSV
          </button>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="audit-log-panel__cards">
        <SummaryCard label="Audit Events" value={summary?.total ?? pageResult.total} hint="matching filter" />
        <SummaryCard label="Success" value={summary?.success ?? 0} hint="successful actions" />
        <SummaryCard label="Failures" value={summary?.failure ?? 0} hint="failed actions" />
        <SummaryCard label="Critical" value={summary?.critical ?? 0} hint="critical severity" />
      </div>

      <WidgetCard title="Audit Filters" description="Filter, paginate, and export the activity trail">
        <div className="audit-log-panel__filters">
          <label>
            Status
            <select value={status} onChange={(event) => updateStatus(event.target.value as AuditStatus | 'all')}>
              {statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label>
            Severity
            <select value={severity} onChange={(event) => updateSeverity(event.target.value as AuditSeverity | 'all')}>
              {severityOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label>
            Entity
            <select value={entityType} onChange={(event) => updateEntityType(event.target.value as AuditEntityType | 'all')}>
              {entityOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label>
            Page size
            <select value={pageSize} onChange={(event) => updatePageSize(Number(event.target.value))}>
              {pageSizeOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>

        <p className="audit-log-panel__export-note">
          Export uses the current status, severity, and entity filters. Maximum export size: 1000 events.
        </p>
      </WidgetCard>

      <WidgetCard title="Audit Retention" description="Dry-run or prune old audit records from persistent storage">
        <div className="audit-log-panel__retention">
          <label>
            Keep latest days
            <input
              min={1}
              max={3650}
              type="number"
              value={retentionDays}
              onChange={(event) => setRetentionDays(Number(event.target.value))}
            />
          </label>

          <div className="audit-log-panel__retention-actions">
            <button type="button" disabled={retentionBusy} onClick={() => void runRetention(true)}>
              Dry Run
            </button>
            <button type="button" disabled={retentionBusy} onClick={() => void runRetention(false)}>
              Prune Old Logs
            </button>
          </div>
        </div>

        {retentionResult ? (
          <div className="audit-log-panel__retention-result">
            <strong>{retentionResult.dryRun ? 'Dry-run result' : 'Prune result'}</strong>
            <span>Cutoff: {formatTime(retentionResult.cutoff)}</span>
            <span>Matched: {retentionResult.matched}</span>
            <span>Deleted: {retentionResult.deleted}</span>
          </div>
        ) : (
          <p className="audit-log-panel__export-note">
            Dry-run is safe and does not delete data. Prune requires confirmation.
          </p>
        )}
      </WidgetCard>

      <WidgetCard title="Recent Audit Events" description={`Showing ${events.length} of ${pageResult.total} audit event(s)`}>
        <div className="audit-log-panel__pagination">
          <button type="button" disabled={loading || !canPrevious} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            Previous
          </button>
          <span>Page {pageResult.page} / {totalPages}</span>
          <button type="button" disabled={loading || !canNext} onClick={() => setPage((value) => value + 1)}>
            Next
          </button>
        </div>

        <div className="audit-log-panel__list">
          {events.map((event) => (
            <article className="audit-log-panel__event" data-status={event.status} data-severity={event.severity} key={event.id}>
              <div className="audit-log-panel__event-main">
                <div>
                  <strong>{event.summary}</strong>
                  <small>{event.action} · {actorLabel(event)} · {entityLabel(event)}</small>
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

          {!loading && events.length === 0 ? <p className="muted">No audit events found for the current filter.</p> : null}
          {loading ? <p className="muted">Loading audit events...</p> : null}
        </div>
      </WidgetCard>
    </section>
  );
}
