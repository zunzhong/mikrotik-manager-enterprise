import { useCallback, useEffect, useState } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { deviceApi } from '../../devices/device.api';
import { alertApi, type AlertRecord } from '../alert.api';
import type { AlertRule } from '../alert.api';
import { useLanguage } from '../../../i18n/LanguageContext';
import { notificationApi } from '../../notifications/notification.api';

export function AlertCenter() {
  const { t, tr, formatDateTime } = useLanguage();
  const rules = useAsyncData(useCallback(() => alertApi.rules(), []));
  const alerts = useAsyncData(useCallback(() => alertApi.list(), []));
  const devices = useAsyncData(useCallback(() => deviceApi.list(), []));
  const channels = useAsyncData(useCallback(() => notificationApi.channels(), []));

  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [message, setMessage] = useState('');
  const [deviceRules, setDeviceRules] = useState<AlertRule[]>([]);
  const [deletingAlertId, setDeletingAlertId] = useState('');
  const [deletingAll, setDeletingAll] = useState(false);

  const activeDeviceId = selectedDeviceId || devices.data?.[0]?.id || '';

  const refreshDeviceRules = useCallback(async () => {
    if (!activeDeviceId) return setDeviceRules([]);
    try {
      setDeviceRules(await alertApi.deviceRules(activeDeviceId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tải quy tắc thiết bị.');
    }
  }, [activeDeviceId]);

  useEffect(() => {
    void refreshDeviceRules();
  }, [refreshDeviceRules]);

  async function setRule(rule: AlertRule, enabled: boolean) {
    if (!activeDeviceId) return;
    await alertApi.configureDeviceRule(activeDeviceId, rule.key, {
      enabled,
      channelIds: rule.channelIds ?? [],
      notifyAllChannels: rule.notifyAllChannels ?? true,
    });
    setMessage(`${enabled ? t('enable') : t('disable')}: ${rule.title}`);
    await refreshDeviceRules();
  }

  async function setRuleRouting(rule: AlertRule, notifyAllChannels: boolean, channelIds: string[]) {
    if (!activeDeviceId) return;
    await alertApi.configureDeviceRule(activeDeviceId, rule.key, {
      enabled: rule.enabled ?? rule.enabledByDefault ?? false,
      notifyAllChannels,
      channelIds,
    });
    setMessage(
      notifyAllChannels
        ? tr('Quy tắc sẽ gửi tới tất cả kênh đang bật.', 'Rule will notify all enabled channels.')
        : tr(`Đã chọn ${channelIds.length} kênh nhận.`, `${channelIds.length} channels selected.`),
    );
    await refreshDeviceRules();
  }

  async function removeRuleConfig(rule: AlertRule) {
    if (!activeDeviceId) return;
    await alertApi.removeDeviceRuleConfig(activeDeviceId, rule.key);
    setMessage(`Đã xóa cấu hình riêng; quy tắc dùng lại mặc định hệ thống.`);
    await refreshDeviceRules();
  }

  async function evaluateAll() {
    setMessage(tr('Đang đánh giá tất cả quy tắc cảnh báo...', 'Evaluating all alert rules...'));
    try {
      const result = await alertApi.evaluateAll();
      setMessage(
        tr(
          `Đánh giá hoàn tất: ${result.triggered} cảnh báo được kích hoạt.`,
          `Evaluation complete: ${result.triggered} alerts triggered.`,
        ),
      );
      alerts.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Đánh giá thất bại');
    }
  }

  async function evaluateDevice() {
    if (!activeDeviceId) {
      setMessage(tr('Chưa chọn thiết bị.', 'No device selected.'));
      return;
    }

    setMessage(tr('Đang đánh giá thiết bị đã chọn...', 'Evaluating selected device...'));
    try {
      const result = await alertApi.evaluateDevice(activeDeviceId);
      setMessage(
        tr(
          `Đã đánh giá: ${result.triggered} cảnh báo được kích hoạt.`,
          `Evaluation complete: ${result.triggered} alerts triggered.`,
        ),
      );
      alerts.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Đánh giá thiết bị thất bại');
    }
  }

  async function acknowledge(alert: AlertRecord) {
    setMessage(`Đang xác nhận ${alert.title}...`);
    try {
      await alertApi.acknowledge(alert.id);
      setMessage('Đã xác nhận cảnh báo.');
      alerts.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Xác nhận cảnh báo thất bại');
    }
  }

  async function resolve(alert: AlertRecord) {
    setMessage(`Đang đóng cảnh báo ${alert.title}...`);
    try {
      await alertApi.resolve(alert.id);
      setMessage('Cảnh báo đã được xử lý và đóng.');
      alerts.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể đóng cảnh báo.');
    }
  }

  async function deleteAlert(alert: AlertRecord) {
    if (
      !window.confirm(
        tr(
          `Xóa vĩnh viễn cảnh báo "${alert.title}"? Thao tác này không thể hoàn tác.`,
          `Permanently delete alert "${alert.title}"? This action cannot be undone.`,
        ),
      )
    ) {
      return;
    }

    setDeletingAlertId(alert.id);
    try {
      await alertApi.delete(alert.id);
      setMessage(tr('Đã xóa cảnh báo.', 'Alert deleted.'));
      alerts.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : tr('Không thể xóa cảnh báo.', 'Unable to delete alert.'),
      );
    } finally {
      setDeletingAlertId('');
    }
  }

  async function deleteAllAlerts() {
    if (visibleAlerts.length === 0) return;
    const deviceName = devices.data?.find((device) => device.id === activeDeviceId)?.name;
    if (
      !window.confirm(
        tr(
          `Xóa vĩnh viễn toàn bộ ${visibleAlerts.length} cảnh báo${deviceName ? ` của ${deviceName}` : ''}? Thao tác này không thể hoàn tác.`,
          `Permanently delete all ${visibleAlerts.length} alerts${deviceName ? ` for ${deviceName}` : ''}? This action cannot be undone.`,
        ),
      )
    ) {
      return;
    }

    setDeletingAll(true);
    try {
      const result = await alertApi.deleteAll(activeDeviceId || undefined);
      setMessage(tr(`Đã xóa ${result.deleted} cảnh báo.`, `Deleted ${result.deleted} alerts.`));
      alerts.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : tr('Không thể xóa danh sách cảnh báo.', 'Unable to clear alert list.'),
      );
    } finally {
      setDeletingAll(false);
    }
  }

  const visibleAlerts = (alerts.data ?? []).filter(
    (item) => !activeDeviceId || item.deviceId === activeDeviceId,
  );

  const openCount = visibleAlerts.filter((item) => item.status === 'open').length;
  const criticalCount = visibleAlerts.filter(
    (item) => item.severity === 'critical' && item.status === 'open',
  ).length;

  return (
    <div className="alert-center">
      <div className="alert-toolbar">
        <div>
          <h3>{tr('Trung tâm cảnh báo', 'Alert Center')}</h3>
        </div>

        <div className="toolbar-actions">
          <select
            value={activeDeviceId}
            onChange={(event) => setSelectedDeviceId(event.target.value)}
          >
            {(devices.data ?? []).map((device) => (
              <option value={device.id} key={device.id}>
                {device.name} — {device.host}
              </option>
            ))}
            {(devices.data ?? []).length === 0 ? <option value="">Chưa có thiết bị</option> : null}
          </select>
          <button className="small-button" onClick={evaluateDevice}>
            {tr('Đánh giá thiết bị', 'Evaluate device')}
          </button>
          <button className="small-button" onClick={evaluateAll}>
            {tr('Đánh giá tất cả', 'Evaluate all')}
          </button>
        </div>
      </div>

      {message ? <div className="info-banner">{message}</div> : null}
      {rules.error ? <div className="error-banner">{rules.error}</div> : null}
      {alerts.error ? <div className="error-banner">{alerts.error}</div> : null}

      <div className="alert-summary">
        <div className="summary-card">
          <span>{tr('Đang kích hoạt', 'Active')}</span>
          <strong>{openCount}</strong>
          <small>{tr('chưa được xác nhận', 'not acknowledged')}</small>
        </div>
        <div className="summary-card">
          <span>{tr('Nghiêm trọng', 'Critical')}</span>
          <strong>{criticalCount}</strong>
          <small>{tr('cần xử lý ngay', 'requires immediate action')}</small>
        </div>
        <div className="summary-card">
          <span>{tr('Quy tắc', 'Rules')}</span>
          <strong>{rules.data?.length ?? 0}</strong>
          <small>bộ quy tắc duy nhất</small>
        </div>
      </div>

      <div className="alert-grid">
        <section className="alert-panel">
          <h3>{t('alertRules')}</h3>
          <div className="rule-list">
            {(deviceRules.length ? deviceRules : (rules.data ?? [])).map((rule) => (
              <article className="rule-card" key={rule.key}>
                <div>
                  <h4>{rule.title}</h4>
                  <p>{rule.description}</p>
                  <small>
                    {rule.source} • {rule.key}
                  </small>
                </div>
                <div className="rule-card__actions">
                  <span className={`alert-severity sev-${rule.severity}`}>{rule.severity}</span>
                  <button
                    type="button"
                    className={`rule-toggle ${(rule.enabled ?? rule.enabledByDefault) ? 'enabled' : ''}`}
                    onClick={() => void setRule(rule, !(rule.enabled ?? rule.enabledByDefault))}
                  >
                    {(rule.enabled ?? rule.enabledByDefault) ? t('disable') : t('enable')}
                  </button>
                  {rule.configured ? (
                    <button
                      type="button"
                      className="small-button"
                      onClick={() => void removeRuleConfig(rule)}
                    >
                      {t('removeRule')}
                    </button>
                  ) : null}
                </div>
                <div className="rule-channel-routing">
                  <strong>{tr('Kênh nhận cảnh báo', 'Notification channels')}</strong>
                  <label>
                    <input
                      type="checkbox"
                      checked={rule.notifyAllChannels ?? true}
                      onChange={(event) =>
                        void setRuleRouting(rule, event.target.checked, rule.channelIds ?? [])
                      }
                    />
                    {tr('Tất cả kênh đang bật', 'All enabled channels')}
                  </label>
                  {!(rule.notifyAllChannels ?? true)
                    ? (channels.data ?? []).map((channel) => {
                        const selected = (rule.channelIds ?? []).includes(channel.id);
                        return (
                          <label key={channel.id}>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(event) => {
                                const next = event.target.checked
                                  ? [...new Set([...(rule.channelIds ?? []), channel.id])]
                                  : (rule.channelIds ?? []).filter((id) => id !== channel.id);
                                void setRuleRouting(rule, false, next);
                              }}
                            />
                            {channel.name} · {channel.type}{' '}
                            {channel.enabled ? '' : `(${tr('đã tắt', 'disabled')})`}
                          </label>
                        );
                      })
                    : null}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="alert-panel">
          <div className="alert-panel__heading">
            <div>
              <h3>{tr('Danh sách cảnh báo', 'Alert list')}</h3>
              <small>
                {tr(
                  `${visibleAlerts.length} cảnh báo của thiết bị đang chọn`,
                  `${visibleAlerts.length} alerts for the selected device`,
                )}
              </small>
            </div>
            <button
              type="button"
              className="danger-button"
              disabled={deletingAll || visibleAlerts.length === 0}
              onClick={() => void deleteAllAlerts()}
            >
              {deletingAll ? tr('Đang xóa...', 'Deleting...') : tr('Xóa toàn bộ', 'Delete all')}
            </button>
          </div>
          <div className="alert-list">
            {visibleAlerts.map((alert) => (
              <article className="alert-card" key={alert.id}>
                <div className="alert-card-header">
                  <div>
                    <h4>{alert.title}</h4>
                    <p>{alert.message}</p>
                    <small>
                      {alert.device?.name ?? 'Hệ thống'} · {alert.source} ·{' '}
                      {formatDateTime(alert.createdAt)}
                    </small>
                    {alert.status === 'acknowledged' && alert.acknowledgedAt ? (
                      <small className="alert-state-time status-acknowledged">
                        {tr('Đã xác nhận', 'Acknowledged')} - {formatDateTime(alert.acknowledgedAt)}
                      </small>
                    ) : null}
                    {alert.status === 'resolved' && alert.resolvedAt ? (
                      <small className="alert-state-time status-resolved">
                        {tr('Đã xử lý', 'Resolved')} - {formatDateTime(alert.resolvedAt)}
                      </small>
                    ) : null}
                    <AlertMetadata metadata={alert.metadata} />
                  </div>
                  <div className="alert-badges">
                    <span className={`alert-severity sev-${alert.severity}`}>
                      {severityLabel(alert.severity, tr)}
                    </span>
                    <span className={`alert-status status-${alert.status}`}>
                      {statusLabel(alert.status, tr)}
                    </span>
                  </div>
                </div>

                {alert.status === 'open' ? (
                  <button className="small-button" onClick={() => acknowledge(alert)}>
                    {tr('Xác nhận cảnh báo', 'Acknowledge alert')}
                  </button>
                ) : null}
                {alert.status !== 'resolved' ? (
                  <button className="small-button" onClick={() => void resolve(alert)}>
                    {tr('Đánh dấu đã xử lý', 'Mark resolved')}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="small-button danger-button"
                  disabled={deletingAll || deletingAlertId === alert.id}
                  onClick={() => void deleteAlert(alert)}
                >
                  {deletingAlertId === alert.id
                    ? tr('Đang xóa...', 'Deleting...')
                    : tr('Xóa cảnh báo', 'Delete alert')}
                </button>
              </article>
            ))}

            {!alerts.loading && visibleAlerts.length === 0 ? (
              <div className="empty-state">
                <strong>{tr('Chưa có cảnh báo', 'No alerts')}</strong>
                <p>
                  {tr(
                    'Bấm đánh giá để phân tích Inventory, Compliance và dữ liệu sao lưu hiện tại.',
                    'Run an evaluation to analyze current Inventory, Compliance and backup data.',
                  )}
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function statusLabel(status: string, tr: (vi: string, en: string) => string): string {
  if (status === 'open') return tr('Đang kích hoạt', 'Open');
  if (status === 'acknowledged') return tr('Đã xác nhận', 'Acknowledged');
  if (status === 'resolved') return tr('Đã xử lý', 'Resolved');
  return status;
}

function severityLabel(severity: string, tr: (vi: string, en: string) => string): string {
  if (severity === 'critical') return tr('Nghiêm trọng', 'Critical');
  if (severity === 'warning') return tr('Cảnh báo', 'Warning');
  if (severity === 'info') return tr('Thông tin', 'Information');
  return severity;
}

function AlertMetadata({ metadata }: { metadata?: unknown }) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const record = metadata as Record<string, unknown>;
  const fields = ['value', 'threshold', 'unit', 'ageHours', 'recommendation']
    .filter((key) => record[key] !== undefined)
    .map((key) => [key, String(record[key])]);
  if (fields.length === 0) return null;
  return (
    <dl className="alert-metadata">
      {fields.map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
