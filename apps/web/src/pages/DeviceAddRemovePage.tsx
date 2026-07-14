import { useCallback, useState } from 'react';
import { useAsyncData } from '../hooks/useAsyncData';
import { deviceApi, type Device } from '../modules/devices/device.api';
import { RouterOsProbePanel } from '../modules/devices/components/RouterOsProbePanel';
import { StatusBadge } from '../modules/devices/components/StatusBadge';

export function DeviceAddRemovePage() {
  const loadDevices = useCallback(() => deviceApi.list(), []);
  const devices = useAsyncData(loadDevices);
  const [message, setMessage] = useState('');
  const [deletingId, setDeletingId] = useState('');

  async function removeDevice(device: Device) {
    if (
      !window.confirm(
        `Xóa thiết bị "${device.name}" (${device.host}) khỏi MME? Dữ liệu quản lý liên quan có thể bị xóa.`,
      )
    )
      return;
    setDeletingId(device.id);
    setMessage(`Đang xóa ${device.name}...`);
    try {
      await deviceApi.delete(device.id);
      setMessage(`Đã xóa thiết bị ${device.name}.`);
      devices.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể xóa thiết bị.');
    } finally {
      setDeletingId('');
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Thêm / Xóa thiết bị</h2>
        <p>Kiểm tra kết nối API hoặc API-SSL trước khi thêm router vào MME.</p>
      </div>

      <RouterOsProbePanel onDeviceAdded={devices.refresh} />

      <section className="device-management-card">
        <header>
          <div>
            <h3>Thiết bị đang quản lý</h3>
            <p>{devices.data?.length ?? 0} thiết bị</p>
          </div>
          <button className="small-button" type="button" onClick={devices.refresh}>
            Làm mới
          </button>
        </header>
        {message ? <div className="info-banner">{message}</div> : null}
        {devices.error ? <div className="error-banner">{devices.error}</div> : null}
        <div className="managed-device-grid">
          {(devices.data ?? []).map((device) => (
            <article key={device.id} className="managed-device-card">
              <div>
                <strong>{device.name}</strong>
                <span>
                  {device.host}:{device.port} · {device.useTls ? 'API-SSL' : 'API'}
                </span>
              </div>
              <StatusBadge status={device.status} />
              <button
                className="danger-button"
                type="button"
                disabled={deletingId === device.id}
                onClick={() => void removeDevice(device)}
              >
                {deletingId === device.id ? 'Đang xóa...' : 'Xóa thiết bị'}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
