import { useCallback } from 'react';
import { useAsyncData } from '../hooks/useAsyncData';
import { dashboardApi } from '../modules/dashboard/dashboard.api';
import { SummaryCard } from '../modules/dashboard/components/SummaryCard';
import { WidgetCard } from '../modules/dashboard/components/WidgetCard';

export function DashboardPage() {
  const loadSummary = useCallback(() => dashboardApi.summary(), []);
  const loadDevices = useCallback(() => dashboardApi.devices(), []);
  const loadAlerts = useCallback(() => dashboardApi.alerts(), []);
  const loadCompliance = useCallback(() => dashboardApi.compliance(), []);
  const loadInventory = useCallback(() => dashboardApi.inventory(), []);
  const loadActivity = useCallback(() => dashboardApi.activity(), []);

  const summary = useAsyncData(loadSummary);
  const devices = useAsyncData(loadDevices);
  const alerts = useAsyncData(loadAlerts);
  const compliance = useAsyncData(loadCompliance);
  const inventory = useAsyncData(loadInventory);
  const activity = useAsyncData(loadActivity);

  const data = summary.data;

  return (
    <div className="page dashboard-page">
      <div className="page-header dashboard-title-row">
        <div>
          <h2>Enterprise Dashboard</h2>
          <p>Live summary for devices, inventory, compliance, alerts and activity.</p>
        </div>

        <button className="theme-toggle" onClick={summary.refresh}>
          Refresh
        </button>
      </div>

      {summary.error ? <div className="error-banner">{summary.error}</div> : null}

      <div className="summary-grid">
        <SummaryCard label="Total Devices" value={data?.devices.total ?? 0} hint="managed routers" />
        <SummaryCard label="Online" value={data?.devices.online ?? 0} hint="currently reachable" />
        <SummaryCard label="Offline" value={data?.devices.offline ?? 0} hint="requires attention" />
        <SummaryCard label="Open Alerts" value={data?.alerts.open ?? 0} hint={`${data?.alerts.critical ?? 0} critical`} />
        <SummaryCard label="Compliance" value={`${data?.compliance.averageScore ?? 0}%`} hint="average score" />
        <SummaryCard label="Snapshots" value={data?.inventory.snapshots ?? 0} hint="inventory records" />
      </div>

      <div className="dashboard-grid">
        <WidgetCard title="Device Status" description="Latest managed device states">
          <div className="list">
            {(devices.data?.byStatus ?? []).map((item) => (
              <div className="list-row" key={item.status}>
                <span>{item.status}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
            {!devices.loading && (devices.data?.byStatus.length ?? 0) === 0 ? <p className="muted">No device status yet.</p> : null}
          </div>
        </WidgetCard>

        <WidgetCard title="Alerts" description="Recent platform alerts">
          <div className="list">
            {(alerts.data?.recent ?? []).slice(0, 6).map((item) => (
              <div className="list-row vertical" key={item.id}>
                <span>{item.title}</span>
                <small>{item.severity} • {item.status}</small>
              </div>
            ))}
            {!alerts.loading && (alerts.data?.recent.length ?? 0) === 0 ? <p className="muted">No alerts yet.</p> : null}
          </div>
        </WidgetCard>

        <WidgetCard title="Compliance" description="Recent compliance scan results">
          <div className="list">
            {(compliance.data?.recent ?? []).slice(0, 6).map((item) => (
              <div className="list-row" key={item.id}>
                <span>{item.device?.name ?? 'Unknown device'}</span>
                <strong>{item.score}%</strong>
              </div>
            ))}
            {!compliance.loading && (compliance.data?.recent.length ?? 0) === 0 ? <p className="muted">No compliance reports yet.</p> : null}
          </div>
        </WidgetCard>

        <WidgetCard title="Inventory" description="Collected inventory statistics">
          <div className="mini-stats">
            <div><span>Sections</span><strong>{inventory.data?.totals.sections ?? 0}</strong></div>
            <div><span>Items</span><strong>{inventory.data?.totals.items ?? 0}</strong></div>
            <div><span>Diffs</span><strong>{inventory.data?.totals.diffs ?? 0}</strong></div>
          </div>
        </WidgetCard>

        <WidgetCard title="Recent Activity" description="Audit and alert timeline">
          <div className="list">
            {(activity.data ?? []).slice(0, 8).map((item) => (
              <div className="list-row vertical" key={`${item.type}-${item.id}`}>
                <span>{item.title}</span>
                <small>{item.type} • {new Date(item.createdAt).toLocaleString()}</small>
              </div>
            ))}
            {!activity.loading && (activity.data?.length ?? 0) === 0 ? <p className="muted">No activity yet.</p> : null}
          </div>
        </WidgetCard>
      </div>
    </div>
  );
}
