import { useCallback, useState } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { deviceApi } from '../../devices/device.api';
import { alertApi, type AlertRecord } from '../alert.api';

export function AlertCenter() {
  const rules = useAsyncData(useCallback(() => alertApi.rules(), []));
  const alerts = useAsyncData(useCallback(() => alertApi.list(), []));
  const devices = useAsyncData(useCallback(() => deviceApi.list(), []));

  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [message, setMessage] = useState('');

  const activeDeviceId = selectedDeviceId || devices.data?.[0]?.id || '';

  async function evaluateAll() {
    setMessage('Đang đánh giá tất cả quy tắc cảnh báo...');
    try {
      const result = await alertApi.evaluateAll();
      setMessage(`Đánh giá hoàn tất: ${result.triggered} cảnh báo được kích hoạt.`);
      alerts.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Đánh giá thất bại');
    }
  }

  async function evaluateDevice() {
    if (!activeDeviceId) {
      setMessage('Chưa chọn thiết bị.');
      return;
    }

    setMessage('Đang đánh giá thiết bị đã chọn...');
    try {
      const result = await alertApi.evaluateDevice(activeDeviceId);
      setMessage(`Đã đánh giá: ${result.triggered} cảnh báo được kích hoạt.`);
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
          <h3>Trung tâm cảnh báo</h3>
          <p>
            Cảnh báo được gom theo thiết bị và rule; một rule đang hoạt động không tạo bản ghi trùng
            lặp.
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
            Đánh giá thiết bị
          </button>
          <button className="small-button" onClick={evaluateAll}>
            Đánh giá tất cả
          </button>
        </div>
      </div>

      {message ? <div className="info-banner">{message}</div> : null}
      {rules.error ? <div className="error-banner">{rules.error}</div> : null}
      {alerts.error ? <div className="error-banner">{alerts.error}</div> : null}

      <div className="alert-summary">
        <div className="summary-card">
          <span>Đang kích hoạt</span>
          <strong>{openCount}</strong>
          <small>chưa được xác nhận</small>
        </div>
        <div className="summary-card">
          <span>Nghiêm trọng</span>
          <strong>{criticalCount}</strong>
          <small>cần xử lý ngay</small>
        </div>
        <div className="summary-card">
          <span>Quy tắc</span>
          <strong>{rules.data?.length ?? 0}</strong>
          <small>bộ quy tắc duy nhất</small>
        </div>
      </div>

      <div className="alert-grid">
        <section className="alert-panel">
          <h3>Quy tắc cảnh báo</h3>
          <div className="rule-list">
            {(rules.data ?? []).map((rule) => (
              <article className="rule-card" key={rule.key}>
                <div>
                  <h4>{rule.title}</h4>
                  <p>{rule.description}</p>
                  <small>
                    {rule.source} • {rule.key}
                  </small>
                </div>
                <span className={`alert-severity sev-${rule.severity}`}>{rule.severity}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="alert-panel">
          <h3>Danh sách cảnh báo</h3>
          <div className="alert-list">
            {visibleAlerts.map((alert) => (
              <article className="alert-card" key={alert.id}>
                <div className="alert-card-header">
                  <div>
                    <h4>{alert.title}</h4>
                    <p>{alert.message}</p>
                    <small>
                      {alert.device?.name ?? 'Hệ thống'} · {alert.source} ·{' '}
                      {new Date(alert.createdAt).toLocaleString()}
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
                    Xác nhận cảnh báo
                  </button>
                ) : null}
                {alert.status !== 'resolved' ? (
                  <button className="small-button" onClick={() => void resolve(alert)}>
                    Đánh dấu đã xử lý
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
