import { useCallback, useEffect, useState } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { deviceApi } from '../../devices/device.api';
import { alertApi, type AlertRecord } from '../alert.api';
import type { AlertRule } from '../alert.api';
import { useLanguage } from '../../../i18n/LanguageContext';

export function AlertCenter() {
  const { t, tr, formatDateTime } = useLanguage();
  const rules = useAsyncData(useCallback(() => alertApi.rules(), []));
  const alerts = useAsyncData(useCallback(() => alertApi.list(), []));
  const devices = useAsyncData(useCallback(() => deviceApi.list(), []));

  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [message, setMessage] = useState('');
  const [deviceRules, setDeviceRules] = useState<AlertRule[]>([]);

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
    await alertApi.configureDeviceRule(activeDeviceId, rule.key, enabled);
    setMessage(`${enabled ? t('enable') : t('disable')}: ${rule.title}`);
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
          <p>
            {tr(
              'Cảnh báo được gom theo thiết bị và quy tắc; một quy tắc đang hoạt động không tạo bản ghi trùng lặp.',
              'Alerts are grouped by device and rule; an active rule never creates duplicate records.',
            )}
          </p>
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
              </article>
            ))}
          </div>
        </section>

        <section className="alert-panel">
          <h3>{tr('Danh sách cảnh báo', 'Alert list')}</h3>
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
                    <AlertMetadata metadata={alert.metadata} />
                  </div>
                  <div className="alert-badges">
                    <span className={`alert-severity sev-${alert.severity}`}>
                      {severityLabel(alert.severity)}
                    </span>
                    <span className={`alert-status status-${alert.status}`}>
                      {statusLabel(alert.status)}
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
              </article>
            ))}

            {!alerts.loading && (alerts.data?.length ?? 0) === 0 ? (
              <div className="empty-state">
                <strong>Chưa có cảnh báo</strong>
                <p>Bấm đánh giá để phân tích Inventory, Compliance và dữ liệu sao lưu hiện tại.</p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function statusLabel(status: string): string {
  if (status === 'open') return 'Đang kích hoạt';
  if (status === 'acknowledged') return 'Đã xác nhận';
  if (status === 'resolved') return 'Đã xử lý';
  return status;
}

function severityLabel(severity: string): string {
  if (severity === 'critical') return 'Nghiêm trọng';
  if (severity === 'warning') return 'Cảnh báo';
  if (severity === 'info') return 'Thông tin';
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
