import { useState } from 'react';
import { SummaryCard } from '../dashboard/components/SummaryCard';
import { WidgetCard } from '../dashboard/components/WidgetCard';
import { alertLifecycleApi } from './alert-lifecycle.api';
import type { AlertLifecycleItem, AlertLifecycleSummary } from './alert-lifecycle.types';
import './alert-lifecycle.css';

export interface AlertLifecyclePanelProps {
  summary?: AlertLifecycleSummary;
  alerts?: AlertLifecycleItem[];
  loading?: boolean;
  error?: string | null;
  onChanged?: () => void;
}

function alertDeviceName(alert: AlertLifecycleItem): string {
  return alert.device?.name ?? alert.deviceId ?? 'System';
}

function occurrenceCount(alert: AlertLifecycleItem): number | null {
  const count = alert.metadata?.occurrenceCount;

  return typeof count === 'number' ? count : null;
}

export function AlertLifecyclePanel({
  summary,
  alerts = [],
  loading = false,
  error,
  onChanged,
}: AlertLifecyclePanelProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function acknowledge(alert: AlertLifecycleItem) {
    setBusyId(alert.id);
    setActionError(null);

    try {
      await alertLifecycleApi.acknowledge(alert.id, {
        reason: 'Acknowledged from Enterprise Dashboard',
      });
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Cannot acknowledge alert');
    } finally {
      setBusyId(null);
    }
  }

  async function resolve(alert: AlertLifecycleItem) {
    setBusyId(alert.id);
    setActionError(null);

    try {
      await alertLifecycleApi.resolve(alert.id, {
        reason: 'Resolved from Enterprise Dashboard',
      });
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Cannot resolve alert');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="alert-lifecycle-panel">
      <div className="alert-lifecycle-panel__header">
        <div>
          <p className="alert-lifecycle-panel__eyebrow">Alert Lifecycle</p>
          <h3>Open / Acknowledge / Resolve</h3>
          <p>
            Enterprise alert lifecycle generated from realtime health events and device state
            changes.
          </p>
        </div>

        <strong>{summary?.activeTotal ?? 0}</strong>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {actionError ? <div className="error-banner">{actionError}</div> : null}

      <div className="alert-lifecycle-panel__cards">
        <SummaryCard label="Open Alerts" value={summary?.status.open ?? 0} hint="needs triage" />
        <SummaryCard
          label="Acknowledged"
          value={summary?.status.acknowledged ?? 0}
          hint="accepted by operator"
        />
        <SummaryCard
          label="Critical Active"
          value={summary?.activeSeverity.critical ?? 0}
          hint="highest priority"
        />
        <SummaryCard
          label="Warning Active"
          value={summary?.activeSeverity.warning ?? 0}
          hint="watch closely"
        />
      </div>

      <WidgetCard title="Active Alert Lifecycle" description="Acknowledge or resolve current alerts">
        <div className="alert-lifecycle-panel__list">
          {alerts.slice(0, 8).map((alert) => {
            const count = occurrenceCount(alert);
            const busy = busyId === alert.id;

            return (
              <article className="alert-lifecycle-panel__alert" data-severity={alert.severity} key={alert.id}>
                <div className="alert-lifecycle-panel__alert-main">
                  <div>
                    <strong>{alert.title}</strong>
                    <p>{alert.message}</p>
                    <small>
                      {alertDeviceName(alert)} · {alert.ruleKey} · {new Date(alert.createdAt).toLocaleString()}
                      {count ? ` · ${count} occurrences` : ''}
                    </small>
                  </div>

                  <span>{alert.severity}</span>
                </div>

                <div className="alert-lifecycle-panel__actions">
                  <button
                    type="button"
                    disabled={busy || alert.status === 'acknowledged'}
                    onClick={() => void acknowledge(alert)}
                  >
                    {alert.status === 'acknowledged' ? 'Acknowledged' : 'Acknowledge'}
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void resolve(alert)}
                  >
                    Resolve
                  </button>
                </div>
              </article>
            );
          })}

          {!loading && alerts.length === 0 ? (
            <p className="muted">No active alerts. Health lifecycle is clear.</p>
          ) : null}

          {loading ? <p className="muted">Loading alert lifecycle...</p> : null}
        </div>
      </WidgetCard>
    </section>
  );
}
