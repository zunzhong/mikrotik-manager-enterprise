import { useCallback, useState } from 'react';
import { useAsyncData } from '../hooks/useAsyncData';
import { deviceApi, type Device } from '../modules/devices/device.api';
import { RouterOsProbePanel } from '../modules/devices/components/RouterOsProbePanel';
import { StatusBadge } from '../modules/devices/components/StatusBadge';
import { useLanguage } from '../i18n/LanguageContext';

export function DeviceAddRemovePage() {
  const { t, tr } = useLanguage();
  const loadDevices = useCallback(() => deviceApi.list(), []);
  const devices = useAsyncData(loadDevices);
  const [message, setMessage] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [savingId, setSavingId] = useState('');
  const [draft, setDraft] = useState({
    name: '',
    host: '',
    port: 8728,
    username: '',
    password: '',
    useTls: false,
  });

  function beginEdit(device: Device) {
    setEditingId(device.id);
    setDraft({
      name: device.name,
      host: device.host,
      port: device.port,
      username: device.username,
      password: '',
      useTls: device.useTls,
    });
  }

  async function saveDevice(device: Device) {
    setSavingId(device.id);
    setMessage(`Đang cập nhật ${device.name}...`);
    try {
      await deviceApi.update(device.id, {
        name: draft.name.trim(),
        host: draft.host.trim(),
        port: draft.port,
        username: draft.username.trim(),
        useTls: draft.useTls,
        ...(draft.password ? { password: draft.password } : {}),
      });
      setMessage(`Đã cập nhật thiết bị ${draft.name}.`);
      setEditingId('');
      devices.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể cập nhật thiết bị.');
    } finally {
      setSavingId('');
    }
  }

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
        <h2>{t('addEditDevice')}</h2>
        <p>
          {tr(
            'Kiểm tra kết nối API hoặc API-SSL trước khi thêm router vào MME.',
            'Test API or API-SSL connectivity before adding a router to MME.',
          )}
        </p>
      </div>

      <RouterOsProbePanel onDeviceAdded={devices.refresh} />

      <section className="device-management-card">
        <header>
          <div>
            <h3>{t('managedDevices')}</h3>
            <p>{devices.data?.length ?? 0} thiết bị</p>
          </div>
          <button className="small-button" type="button" onClick={devices.refresh}>
            {t('refresh')}
          </button>
        </header>
        {message ? <div className="info-banner">{message}</div> : null}
        {devices.error ? <div className="error-banner">{devices.error}</div> : null}
        <div className="managed-device-grid">
          {(devices.data ?? []).map((device) => (
            <article key={device.id} className="managed-device-card">
              {editingId === device.id ? (
                <div className="managed-device-edit">
                  <label>
                    {tr('Tên', 'Name')}
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    />
                  </label>
                  <label>
                    Host
                    <input
                      value={draft.host}
                      onChange={(e) => setDraft({ ...draft, host: e.target.value })}
                    />
                  </label>
                  <label>
                    Port
                    <input
                      type="number"
                      value={draft.port}
                      onChange={(e) => setDraft({ ...draft, port: Number(e.target.value) })}
                    />
                  </label>
                  <label>
                    Username
                    <input
                      value={draft.username}
                      onChange={(e) => setDraft({ ...draft, username: e.target.value })}
                    />
                  </label>
                  <label>
                    {tr('Mật khẩu mới', 'New password')}
                    <input
                      type="password"
                      placeholder={tr(
                        'Để trống nếu giữ nguyên',
                        'Leave blank to keep current password',
                      )}
                      value={draft.password}
                      onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                    />
                  </label>
                  <label>
                    {tr('Giao thức', 'Protocol')}
                    <select
                      value={draft.useTls ? 'ssl' : 'api'}
                      onChange={(e) => {
                        const useTls = e.target.value === 'ssl';
                        setDraft({
                          ...draft,
                          useTls,
                          port:
                            draft.port === 8728 || draft.port === 8729
                              ? useTls
                                ? 8729
                                : 8728
                              : draft.port,
                        });
                      }}
                    >
                      <option value="api">API</option>
                      <option value="ssl">API-SSL</option>
                    </select>
                  </label>
                  <div className="managed-device-edit__actions">
                    <button
                      className="small-button"
                      type="button"
                      disabled={savingId === device.id}
                      onClick={() => void saveDevice(device)}
                    >
                      {t('save')}
                    </button>
                    <button className="small-button" type="button" onClick={() => setEditingId('')}>
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <strong>{device.name}</strong>
                  <span>
                    {device.host}:{device.port} · {device.useTls ? 'API-SSL' : 'API'}
                  </span>
                </div>
              )}
              <StatusBadge status={device.status} />
              {editingId !== device.id ? (
                <button className="small-button" type="button" onClick={() => beginEdit(device)}>
                  {t('edit')}
                </button>
              ) : null}
              <button
                className="danger-button"
                type="button"
                disabled={deletingId === device.id}
                onClick={() => void removeDevice(device)}
              >
                {deletingId === device.id ? 'Đang xóa...' : t('deleteDevice')}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
