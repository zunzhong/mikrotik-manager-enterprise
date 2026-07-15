import { StatusBadge } from './StatusBadge';
import type { Device } from '../device.api';
import { useLanguage } from '../../../i18n/LanguageContext';

export interface DeviceDetailHeaderProps {
  device: Device;
}

export function DeviceDetailHeader({ device }: DeviceDetailHeaderProps) {
  const { formatDateTime } = useLanguage();
  return (
    <div className="device-detail-header">
      <div>
        <p className="device-detail-header__eyebrow">Router MikroTik đang quản lý</p>
        <h2>{device.name}</h2>
        <p className="device-detail-header__meta">
          {device.host}:{device.port} · {device.useTls ? 'API-SSL' : 'API'} · {device.loginMode}
        </p>
      </div>

      <div className="device-detail-header__status">
        <StatusBadge status={device.status} />
        <span>
          Lần cuối kết nối: {device.lastSeenAt ? formatDateTime(device.lastSeenAt) : 'Chưa có'}
        </span>
      </div>
    </div>
  );
}
