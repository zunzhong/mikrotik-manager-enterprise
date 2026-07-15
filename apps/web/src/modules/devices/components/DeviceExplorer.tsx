import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { DeviceDashboard } from '../DeviceDashboard';
import { DeviceInterfaceExplorer } from '../DeviceInterfaceExplorer';
import { DeviceTrafficMonitor } from '../DeviceTrafficMonitor';
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
import { useLanguage } from '../../../i18n/LanguageContext';

type TabId =
  | 'overview'
  | 'realtime'
  | 'traffic'
  | 'inventory'
  | 'backups'
  | 'compliance'
  | 'alerts'
  | 'terminal';

export function DeviceExplorer({ detailOnlyId }: { detailOnlyId?: string } = {}) {
  const { t } = useLanguage();
  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'overview', label: t('overview') },
    { id: 'realtime', label: t('realtime') },
    { id: 'traffic', label: t('trafficMonitor') },
    { id: 'inventory', label: t('inventory') },
    { id: 'backups', label: t('backups') },
    { id: 'compliance', label: t('compliance') },
    { id: 'alerts', label: t('alerts') },
    { id: 'terminal', label: t('terminal') },
  ];
  const loadDevices = useCallback(() => deviceApi.list(), []);
  const { data, loading, error, refresh } = useAsyncData(loadDevices);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | undefined>(
    () => detailOnlyId ?? searchParams.get('device') ?? undefined,
  );
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  useEffect(() => {
    const requested = detailOnlyId ?? searchParams.get('device') ?? undefined;
    setSelectedId(requested);
    const requestedTab = searchParams.get('tab') as TabId | null;
    setActiveTab(
      requestedTab && tabs.some((tab) => tab.id === requestedTab) ? requestedTab : 'overview',
    );
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
    setActiveTab('overview');
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
                    className={activeTab === tab.id ? 'active' : ''}
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSearchParams(
                        { ...(selected?.id ? { device: selected.id } : {}), tab: tab.id },
                        { replace: true },
                      );
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>

              <main className="device-detail-content">
                {activeTab === 'overview' ? (
                  <div className="device-explorer-section">
                    <DeviceQuickActions device={selected} />
                    <DeviceMetricCharts deviceId={selected.id} />
                    <DeviceDashboard deviceId={selected.id} />
                  </div>
                ) : null}

                {activeTab === 'realtime' ? <DeviceRealtimeMonitor deviceId={selected.id} /> : null}

                {activeTab === 'inventory' ? (
                  <div className="device-explorer-section">
                    <DeviceInventoryPanel deviceId={selected.id} />
                  </div>
                ) : null}

                {activeTab === 'traffic' ? (
                  <div className="device-explorer-section">
                    <DeviceTrafficMonitor deviceId={selected.id} />
                    <DeviceInterfaceExplorer deviceId={selected.id} />
                  </div>
                ) : null}

                {activeTab === 'backups' ? <DeviceBackupsPanel deviceId={selected.id} /> : null}

                {activeTab === 'compliance' ? (
                  <ComingSoonPanel
                    title="Compliance"
                    description="Security baseline, risky services and remediation actions will be connected in the Compliance epic."
                  />
                ) : null}

                {activeTab === 'alerts' ? <DeviceAlertsPanel deviceId={selected.id} /> : null}

                {activeTab === 'terminal' ? (
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
