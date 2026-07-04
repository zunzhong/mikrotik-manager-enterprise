import { useCallback, useMemo, useState } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { deviceApi, type Device } from '../device.api';
import { DeviceInventoryPanel } from './DeviceInventoryPanel';
import { StatusBadge } from './StatusBadge';

const tabs = ['Overview', 'Inventory', 'Backups', 'Compliance', 'Alerts'];

export function DeviceExplorer() {
  const loadDevices = useCallback(() => deviceApi.list(), []);
  const { data, loading, error, refresh } = useAsyncData(loadDevices);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState('Overview');

  const devices = data ?? [];
  const selected = useMemo<Device | undefined>(() => {
    return devices.find((device) => device.id === selectedId) ?? devices[0];
  }, [devices, selectedId]);

  return (
    <div className="explorer-layout">
      <aside className="explorer-list">
        <div className="explorer-list-header">
          <div>
            <h3>Devices</h3>
            <p>{devices.length} managed routers</p>
          </div>
          <button className="small-button" onClick={refresh}>
            Refresh
          </button>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}
        {loading ? <p className="muted">Loading devices...</p> : null}

        {!loading && devices.length === 0 ? (
          <div className="empty-state">
            <strong>No devices yet</strong>
            <p>Add a MikroTik router from backend API or upcoming UI form.</p>
          </div>
        ) : null}

        <div className="device-list">
          {devices.map((device) => (
            <button
              key={device.id}
              className={`device-list-item ${selected?.id === device.id ? 'active' : ''}`}
              onClick={() => setSelectedId(device.id)}
              type="button"
            >
              <span className="device-name">{device.name}</span>
              <span className="device-host">
                {device.host}:{device.port}
              </span>
              <StatusBadge status={device.status} />
            </button>
          ))}
        </div>
      </aside>

      <section className="explorer-detail">
        {!selected ? (
          <div className="empty-state large">
            <strong>Select a device</strong>
            <p>Device Explorer will show RouterOS inventory, services and configuration.</p>
          </div>
        ) : (
          <>
            <div className="detail-header">
              <div>
                <h2>{selected.name}</h2>
                <p>
                  {selected.host}:{selected.port}
                </p>
              </div>
              <StatusBadge status={selected.status} />
            </div>

            <div className="explorer-tabs">
              {tabs.map((tab) => (
                <button
                  className={activeTab === tab ? 'active' : ''}
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'Overview' ? (
              <>
                <div className="detail-grid">
                  <div className="detail-card">
                    <span>Connection</span>
                    <strong>{selected.useTls ? 'TLS' : 'Plain API'}</strong>
                    <p>Login mode: {selected.loginMode}</p>
                  </div>
                  <div className="detail-card">
                    <span>Credentials</span>
                    <strong>{selected.username}</strong>
                    <p>Password is encrypted and never displayed.</p>
                  </div>
                  <div className="detail-card">
                    <span>Last Seen</span>
                    <strong>
                      {selected.lastSeenAt
                        ? new Date(selected.lastSeenAt).toLocaleString()
                        : 'Never'}
                    </strong>
                    <p>{selected.lastError ?? 'No error recorded'}</p>
                  </div>
                  <div className="detail-card">
                    <span>Tags</span>
                    <strong>{selected.tags.length}</strong>
                    <p>{selected.tags.length ? selected.tags.join(', ') : 'No tags'}</p>
                  </div>
                </div>
              </>
            ) : null}

            {activeTab === 'Inventory' ? <DeviceInventoryPanel deviceId={selected.id} /> : null}

            {!['Overview', 'Inventory'].includes(activeTab) ? (
              <div className="placeholder-panel">
                <h3>{activeTab}</h3>
                <p>This tab will be connected in an upcoming part.</p>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
