import { StatusBadge } from './StatusBadge';
import type { Device } from '../device.api';

export interface DeviceDetailHeaderProps {
  device: Device;
}

export function DeviceDetailHeader({ device }: DeviceDetailHeaderProps) {
  return (
    <div className="device-detail-header">
      <div>
        <p className="device-detail-header__eyebrow">Managed MikroTik Router</p>
        <h2>{device.name}</h2>
        <p className="device-detail-header__meta">
          {device.host}:{device.port} · {device.useTls ? 'API-SSL' : 'API'} · {device.loginMode}
        </p>
      </div>

      <div className="device-detail-header__status">
        <StatusBadge status={device.status} />
        <span>
          Last seen:{' '}
          {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : 'Never'}
        </span>
      </div>
    </div>
  );
}
