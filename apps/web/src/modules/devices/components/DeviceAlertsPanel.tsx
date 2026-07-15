import { useCallback } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { alertApi } from '../../alerts/alert.api';
import { useLanguage } from '../../../i18n/LanguageContext';

export function DeviceAlertsPanel({ deviceId }: { deviceId: string }) {
  const { formatDateTime } = useLanguage();
  const alerts = useAsyncData(
    useCallback(
      async () => (await alertApi.list()).filter((item) => item.deviceId === deviceId),
      [deviceId],
    ),
  );
  async function evaluate() {
    await alertApi.evaluateDevice(deviceId);
    alerts.refresh();
  }
  async function ack(id: string) {
    await alertApi.acknowledge(id);
    alerts.refresh();
  }
  async function resolve(id: string) {
    await alertApi.resolve(id);
    alerts.refresh();
  }
  return (
    <section className="device-subpanel">
      <header>
        <div>
          <p className="device-dashboard__eyebrow">Device Alerts</p>
          <h3>Cảnh báo của thiết bị</h3>
        </div>
        <button className="small-button" type="button" onClick={() => void evaluate()}>
          Đánh giá ngay
        </button>
      </header>
      {alerts.error ? <div className="error-banner">{alerts.error}</div> : null}
      <div className="device-alert-list">
        {(alerts.data ?? []).map((alert) => (
          <article key={alert.id} data-severity={alert.severity}>
            <div>
              <strong>{alert.title}</strong>
              <p>{alert.message}</p>
              <small>
                {formatDateTime(alert.createdAt)} ·{' '}
                {alert.status === 'open'
                  ? 'Đang kích hoạt'
                  : alert.status === 'acknowledged'
                    ? 'Đã xác nhận'
                    : 'Đã xử lý'}
              </small>
            </div>
            <div className="toolbar-actions">
              {alert.status === 'open' ? (
                <button className="small-button" onClick={() => void ack(alert.id)}>
                  Xác nhận
                </button>
              ) : null}
              {alert.status !== 'resolved' ? (
                <button className="small-button" onClick={() => void resolve(alert.id)}>
                  Đã xử lý
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      {!alerts.loading && (alerts.data?.length ?? 0) === 0 ? (
        <div className="empty-state">Thiết bị chưa có cảnh báo.</div>
      ) : null}
    </section>
  );
}
