import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { DeviceDashboard } from '../DeviceDashboard';
import { DeviceInterfaceExplorer } from '../DeviceInterfaceExplorer';
import { DeviceInterfaceTrafficCharts } from '../DeviceInterfaceTrafficCharts';
import { DeviceInventoryTimeline } from '../DeviceInventoryTimeline';
import { DeviceMetricCharts } from '../DeviceMetricCharts';
import { DeviceRealtimeMonitor } from '../DeviceRealtimeMonitor';
import { deviceApi, type Device } from '../device.api';
import { DeviceDetailHeader } from './DeviceDetailHeader';
import { DeviceInventoryPanel } from './DeviceInventoryPanel';
import { DeviceQuickActions } from './DeviceQuickActions';
import { DeviceTerminal } from './DeviceTerminal';
import { DeviceAlertsPanel } from './DeviceAlertsPanel';
import { DeviceBackupsPanel } from './DeviceBackupsPanel';
import { StatusBadge } from './StatusBadge';

const tabs = [
  'Overview',
  'Realtime',
  'Interfaces',
  'Inventory',
  'Backups',
  'Compliance',
  'Alerts',
  'Terminal',
];

export function DeviceExplorer({ detailOnlyId }: { detailOnlyId?: string } = {}) {
  const loadDevices = useCallback(() => deviceApi.list(), []);
  const { data, loading, error, refresh } = useAsyncData(loadDevices);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | undefined>(
    () => detailOnlyId ?? searchParams.get('device') ?? undefined,
  );
  const [activeTab, setActiveTab] = useState('Overview');

  useEffect(() => {
    const requested = detailOnlyId ?? searchParams.get('device') ?? undefined;
    setSelectedId(requested);
    setActiveTab('Overview');
  }, [detailOnlyId, searchParams]);

  const devices = data ?? [];
  const selected = useMemo<Device | undefined>(() => {
    return (
      devices.find((device) => device.id === selectedId) ?? (detailOnlyId ? undefined : devices[0])
    );
  }, [detailOnlyId, devices, selectedId]);

  function selectDevice(deviceId: string) {
    setSelectedId(deviceId);
    setSearchParams({ device: deviceId }, { replace: true });
    setActiveTab('Overview');
  }

  return (
    <div className={`explorer-layout ${detailOnlyId ? 'detail-only' : ''}`}>
      {!detailOnlyId ? (
        <aside className="explorer-list">
          <div className="explorer-list-header">
            <div>
              <h3>Devices</h3>
              <p>{devices.length} managed routers</p>
            </div>
            <button className="small-button" onClick={refresh} type="button">
              Refresh
            </button>
          </div>

          {error ? <div className="error-banner">{error}</div> : null}
          {loading ? <p className="muted">Loading devices...</p> : null}

          {!loading && devices.length === 0 ? (
            <div className="empty-state">
              <strong>No devices yet</strong>
              <p>Test a RouterOS connection above, then add the router to MME.</p>
            </div>
          ) : null}

          <div className="device-list">
            {devices.map((device) => (
              <button
                key={device.id}
                className={`device-list-item ${selected?.id === device.id ? 'active' : ''}`}
                onClick={() => selectDevice(device.id)}
                type="button"
              >
                <span className="device-name">{device.name}</span>
                <span className="device-host">
                  {device.host}:{device.port}
                </span>
                <StatusBadge status={device.status} />
                <span className="device-list-item__arrow" aria-hidden="true">
                  ›
                </span>
              </button>
            ))}
          </div>
        </aside>
      ) : null}

      <section className="explorer-detail">
        {!selected ? (
          <div className="empty-state large">
            <strong>Select a device</strong>
            <p>Device Explorer will show RouterOS inventory, services and configuration.</p>
          </div>
        ) : (
          <div className="device-detail-layout">
            <DeviceDetailHeader device={selected} />

            <div className="device-detail-layout__body">
              <nav className="device-detail-nav" aria-label="Device detail tabs">
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
              </nav>

              <main className="device-detail-content">
                {activeTab === 'Overview' ? (
                  <div className="device-explorer-section">
                    <DeviceQuickActions device={selected} />
                    <DeviceMetricCharts deviceId={selected.id} />
                    <DeviceDashboard deviceId={selected.id} />
                  </div>
                ) : null}

                {activeTab === 'Realtime' ? <DeviceRealtimeMonitor deviceId={selected.id} /> : null}

                {activeTab === 'Inventory' ? (
                  <div className="device-explorer-section">
                    <DeviceInventoryTimeline deviceId={selected.id} />
                    <DeviceInventoryPanel deviceId={selected.id} />
                  </div>
                ) : null}

                {activeTab === 'Interfaces' ? (
                  <div className="device-explorer-section">
                    <DeviceInterfaceTrafficCharts deviceId={selected.id} />
                    <DeviceInterfaceExplorer deviceId={selected.id} />
                  </div>
                ) : null}

                {activeTab === 'Backups' ? <DeviceBackupsPanel deviceId={selected.id} /> : null}

                {activeTab === 'Compliance' ? (
                  <ComingSoonPanel
                    title="Compliance"
                    description="Security baseline, risky services and remediation actions will be connected in the Compliance epic."
                  />
                ) : null}

                {activeTab === 'Alerts' ? <DeviceAlertsPanel deviceId={selected.id} /> : null}

                {activeTab === 'Terminal' ? (
                  <DeviceTerminal deviceId={selected.id} deviceName={selected.name} />
                ) : null}
              </main>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ComingSoonPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="placeholder-panel">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
