import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAsyncData } from '../hooks/useAsyncData';
import { deviceApi } from '../modules/devices/device.api';
import { StatusBadge } from '../modules/devices/components/StatusBadge';
import { useLanguage } from '../i18n/LanguageContext';

export function DeviceListPage() {
  const { formatDateTime } = useLanguage();
  const devices = useAsyncData(useCallback(() => deviceApi.list(), []));
  return (
    <div className="page">
      <div className="page-header device-list-title">
        <div>
          <h2>Danh sách thiết bị</h2>
          <p>Chọn một router để mở bảng theo dõi và quản trị chi tiết.</p>
        </div>
        <Link className="primary-link" to="/devices/add-remove">
          + Thêm thiết bị
        </Link>
      </div>
      {devices.error ? <div className="error-banner">{devices.error}</div> : null}
      <div className="device-catalog">
        {(devices.data ?? []).map((device) => (
          <Link className="device-catalog-card" key={device.id} to={`/devices/${device.id}`}>
            <div className="device-catalog-card__icon">◉</div>
            <div>
              <strong>{device.name}</strong>
              <span>
                {device.host}:{device.port}
              </span>
              <small>
                {device.useTls ? 'API-SSL' : 'API'} ·{' '}
                {device.lastSeenAt
                  ? `Gặp lần cuối ${formatDateTime(device.lastSeenAt)}`
                  : 'Đang chờ thu thập'}
              </small>
            </div>
            <StatusBadge status={device.status} />
            <span className="device-catalog-card__arrow">›</span>
          </Link>
        ))}
      </div>
      {!devices.loading && (devices.data?.length ?? 0) === 0 ? (
        <div className="empty-state">
          <strong>Chưa có thiết bị</strong>
          <p>Hãy thêm router đầu tiên để bắt đầu.</p>
        </div>
      ) : null}
    </div>
  );
}
