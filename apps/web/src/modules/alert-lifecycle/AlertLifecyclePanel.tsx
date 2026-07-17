import { useMemo, useState } from 'react';
import { SummaryCard } from '../dashboard/components/SummaryCard';
import { WidgetCard } from '../dashboard/components/WidgetCard';
import { alertLifecycleApi } from './alert-lifecycle.api';
import type { AlertLifecycleItem, AlertLifecycleSummary } from './alert-lifecycle.types';
import './alert-lifecycle.css';
import { useLanguage } from '../../i18n/LanguageContext';

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
  const { formatDateTime, tr } = useLanguage();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeAlertIds = useMemo(() => alerts.map((alert) => alert.id), [alerts]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedCount = selectedIds.length;
  const allSelected =
    activeAlertIds.length > 0 && activeAlertIds.every((id) => selectedSet.has(id));

  function clearSelection() {
    setSelectedIds([]);
  }

  function toggleSelection(alertId: string) {
    setSelectedIds((current) =>
      current.includes(alertId) ? current.filter((id) => id !== alertId) : [...current, alertId],
    );
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : activeAlertIds);
  }

  async function acknowledge(alert: AlertLifecycleItem) {
    setBusyId(alert.id);
    setActionError(null);

    try {
      await alertLifecycleApi.acknowledge(alert.id, {
        reason: 'Acknowledged from Enterprise Dashboard',
      });
      setSelectedIds((current) => current.filter((id) => id !== alert.id));
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
      setSelectedIds((current) => current.filter((id) => id !== alert.id));
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Cannot resolve alert');
    } finally {
      setBusyId(null);
    }
  }

  async function acknowledgeSelected() {
    if (selectedIds.length === 0) return;

    setBulkBusy(true);
    setActionError(null);

    try {
      await alertLifecycleApi.bulkAcknowledge({
        alertIds: selectedIds,
        reason: 'Bulk acknowledged from Enterprise Dashboard',
      });
      clearSelection();
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Cannot bulk acknowledge alerts');
    } finally {
      setBulkBusy(false);
    }
  }

  async function resolveSelected() {
    if (selectedIds.length === 0) return;

    setBulkBusy(true);
    setActionError(null);

    try {
      await alertLifecycleApi.bulkResolve({
        alertIds: selectedIds,
        reason: 'Bulk resolved from Enterprise Dashboard',
      });
      clearSelection();
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Cannot bulk resolve alerts');
    } finally {
      setBulkBusy(false);
    }
  }

  async function resolveDeviceActive(alert: AlertLifecycleItem) {
    if (!alert.deviceId) return;

    setBusyId(alert.id);
    setActionError(null);

    try {
      await alertLifecycleApi.resolveActiveForDevice(alert.deviceId, {
        reason: `Resolved active alerts for ${alertDeviceName(alert)} from Enterprise Dashboard`,
      });
      setSelectedIds((current) => current.filter((id) => id !== alert.id));
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Cannot resolve device alerts');
    } finally {
      setBusyId(null);
    }
  }

  async function deleteAlert(alert: AlertLifecycleItem) {
    if (!window.confirm(`Delete alert “${alert.title}” permanently?`)) return;
    setBusyId(alert.id);
    setActionError(null);
    try {
      await alertLifecycleApi.delete(alert.id);
      setSelectedIds((current) => current.filter((id) => id !== alert.id));
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Cannot delete alert');
    } finally {
      setBusyId(null);
    }
  }

  async function deleteAllAlerts() {
    if (alerts.length === 0 || !window.confirm('Delete all alert lifecycle records permanently?'))
      return;
    setBulkBusy(true);
    setActionError(null);
    try {
      await alertLifecycleApi.deleteAll();
      clearSelection();
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Cannot delete all alerts');
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <section className="alert-lifecycle-panel">
      <div className="alert-lifecycle-panel__header">
        <div>
          <p className="alert-lifecycle-panel__eyebrow">
            {tr('Vòng đời cảnh báo', 'Alert Lifecycle')}
          </p>
          <h3>{tr('Mở / Xác nhận / Xử lý', 'Open / Acknowledge / Resolve')}</h3>
          <p>
            {tr(
              'Theo dõi cảnh báo từ sự kiện sức khỏe và thay đổi trạng thái thiết bị.',
              'Alerts generated from health events and device state changes.',
            )}
          </p>
        </div>

        <strong>{summary?.activeTotal ?? 0}</strong>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {actionError ? <div className="error-banner">{actionError}</div> : null}

      <div className="alert-lifecycle-panel__cards">
        <SummaryCard
          label={tr('Cảnh báo mở', 'Open Alerts')}
          value={summary?.status.open ?? 0}
          hint={tr('cần phân loại', 'needs triage')}
        />
        <SummaryCard
          label={tr('Đã xác nhận', 'Acknowledged')}
          value={summary?.status.acknowledged ?? 0}
          hint={tr('đã được tiếp nhận', 'accepted by operator')}
        />
        <SummaryCard
          label={tr('Nghiêm trọng đang mở', 'Critical Active')}
          value={summary?.activeSeverity.critical ?? 0}
          hint={tr('ưu tiên cao nhất', 'highest priority')}
        />
        <SummaryCard
          label={tr('Cảnh báo đang mở', 'Warning Active')}
          value={summary?.activeSeverity.warning ?? 0}
          hint={tr('cần theo dõi', 'watch closely')}
        />
      </div>

      <WidgetCard
        title={tr('Danh sách cảnh báo đang hoạt động', 'Active Alert Lifecycle')}
        description={tr(
          'Xác nhận hoặc xử lý cảnh báo hiện tại',
          'Acknowledge or resolve current alerts',
        )}
      >
        <div className="alert-lifecycle-panel__toolbar">
          <label>
            <input
              type="checkbox"
              checked={allSelected}
              disabled={alerts.length === 0 || bulkBusy}
              onChange={toggleAll}
            />
            {tr('Chọn tất cả', 'Select all')}
          </label>

          <span>{tr(`${selectedCount} đã chọn`, `${selectedCount} selected`)}</span>

          <button
            type="button"
            disabled={selectedCount === 0 || bulkBusy}
            onClick={() => void acknowledgeSelected()}
          >
            {tr('Xác nhận đã chọn', 'Bulk Acknowledge')}
          </button>

          <button
            type="button"
            disabled={selectedCount === 0 || bulkBusy}
            onClick={() => void resolveSelected()}
          >
            {tr('Xử lý đã chọn', 'Bulk Resolve')}
          </button>

          <button type="button" disabled={selectedCount === 0 || bulkBusy} onClick={clearSelection}>
            {tr('Bỏ chọn', 'Clear')}
          </button>

          <button
            type="button"
            className="danger-button"
            disabled={alerts.length === 0 || bulkBusy}
            onClick={() => void deleteAllAlerts()}
          >
            {tr('Xóa tất cả', 'Delete all')}
          </button>
        </div>

        <div className="alert-lifecycle-panel__list">
          {alerts.slice(0, 8).map((alert) => {
            const count = occurrenceCount(alert);
            const busy = busyId === alert.id;
            const selected = selectedSet.has(alert.id);

            return (
              <article
                className="alert-lifecycle-panel__alert"
                data-selected={selected}
                data-severity={alert.severity}
                key={alert.id}
              >
                <div className="alert-lifecycle-panel__alert-main">
                  <label className="alert-lifecycle-panel__selector">
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={busy || bulkBusy}
                      onChange={() => toggleSelection(alert.id)}
                    />
                  </label>

                  <div>
                    <strong>{alert.title}</strong>
                    <p>{alert.message}</p>
                    <small>
                      {alertDeviceName(alert)} · {alert.ruleKey} · {formatDateTime(alert.createdAt)}
                      {count ? ` · ${count} occurrences` : ''}
                    </small>
                  </div>

                  <span>{alert.severity}</span>
                </div>

                <div className="alert-lifecycle-panel__actions">
                  <button
                    type="button"
                    disabled={busy || bulkBusy || alert.status === 'acknowledged'}
                    onClick={() => void acknowledge(alert)}
                  >
                    {alert.status === 'acknowledged'
                      ? tr('Đã xác nhận', 'Acknowledged')
                      : tr('Xác nhận', 'Acknowledge')}
                  </button>

                  <button
                    type="button"
                    disabled={busy || bulkBusy}
                    onClick={() => void resolve(alert)}
                  >
                    {tr('Đã xử lý', 'Resolve')}
                  </button>

                  <button
                    type="button"
                    disabled={busy || bulkBusy || !alert.deviceId}
                    onClick={() => void resolveDeviceActive(alert)}
                  >
                    {tr('Xử lý theo thiết bị', 'Resolve Device')}
                  </button>

                  <button
                    type="button"
                    className="danger-button"
                    disabled={busy || bulkBusy}
                    onClick={() => void deleteAlert(alert)}
                  >
                    {tr('Xóa', 'Delete')}
                  </button>
                </div>
              </article>
            );
          })}

          {!loading && alerts.length === 0 ? (
            <p className="muted">{tr('Không có cảnh báo đang hoạt động.', 'No active alerts.')}</p>
          ) : null}

          {loading ? (
            <p className="muted">{tr('Đang tải cảnh báo...', 'Loading alert lifecycle...')}</p>
          ) : null}
        </div>
      </WidgetCard>
    </section>
  );
}
