import { AuthSessionDashboardSection } from '../modules/auth-session';
import { useCallback } from 'react';
import { usePollingData } from '../hooks/usePollingData';
import { dashboardApi } from '../modules/dashboard/dashboard.api';
import { notificationApi } from '../modules/notifications/notification.api';
import { NotificationPanel } from '../modules/notifications/NotificationPanel';
import { AuditLogPanel } from '../modules/audit/AuditLogPanel';
import { RbacDashboardSection } from '../modules/rbac';
import { alertLifecycleApi } from '../modules/alert-lifecycle/alert-lifecycle.api';
import { AlertLifecyclePanel } from '../modules/alert-lifecycle/AlertLifecyclePanel';
import { HealthDashboardSummary } from '../modules/dashboard/components/HealthDashboardSummary';
import { deviceApi } from '../modules/devices/device.api';
import { eventApi } from '../modules/events/event.api';
import { DashboardRefreshBar } from '../modules/dashboard/components/DashboardRefreshBar';
import { SummaryCard } from '../modules/dashboard/components/SummaryCard';
import { WidgetCard } from '../modules/dashboard/components/WidgetCard';
import { DashboardCharts } from '../modules/dashboard/components/DashboardCharts';

export function DashboardPage() {
  const loadSummary = useCallback(() => dashboardApi.summary(), []);
  const loadDevices = useCallback(() => dashboardApi.devices(), []);
  const loadAlerts = useCallback(() => dashboardApi.alerts(), []);
  const loadCompliance = useCallback(() => dashboardApi.compliance(), []);
  const loadInventory = useCallback(() => dashboardApi.inventory(), []);
  const loadActivity = useCallback(() => dashboardApi.activity(), []);
  const loadRealtimeOverview = useCallback(() => deviceApi.getRealtimeOverview(), []);
  const loadHealthEvents = useCallback(() => eventApi.list({ limit: 25 }), []);
  const loadAlertLifecycleSummary = useCallback(() => alertLifecycleApi.summary(), []);
  const loadActiveAlerts = useCallback(() => alertLifecycleApi.active(), []);
  const loadNotificationChannels = useCallback(() => notificationApi.channels(), []);
  const loadNotificationRules = useCallback(() => notificationApi.rules(), []);
  const loadNotificationDeliveries = useCallback(() => notificationApi.deliveries(100), []);

  const summary = usePollingData(loadSummary, { enabled: true, intervalMs: 30000 });
  const devices = usePollingData(loadDevices, { enabled: true, intervalMs: 30000 });
  const alerts = usePollingData(loadAlerts, { enabled: true, intervalMs: 30000 });
  const compliance = usePollingData(loadCompliance, { enabled: true, intervalMs: 60000 });
  const inventory = usePollingData(loadInventory, { enabled: true, intervalMs: 60000 });
  const activity = usePollingData(loadActivity, { enabled: true, intervalMs: 30000 });
  const realtimeOverview = usePollingData(loadRealtimeOverview, {
    enabled: true,
    intervalMs: 30000,
  });
  const healthEvents = usePollingData(loadHealthEvents, { enabled: true, intervalMs: 30000 });
  const alertLifecycleSummary = usePollingData(loadAlertLifecycleSummary, {
    enabled: true,
    intervalMs: 30000,
  });
  const activeAlerts = usePollingData(loadActiveAlerts, { enabled: true, intervalMs: 30000 });
  const notificationChannels = usePollingData(loadNotificationChannels, {
    enabled: true,
    intervalMs: 30000,
  });
  const notificationRules = usePollingData(loadNotificationRules, {
    enabled: true,
    intervalMs: 30000,
  });
  const notificationDeliveries = usePollingData(loadNotificationDeliveries, {
    enabled: true,
    intervalMs: 30000,
  });

  const data = summary.data;

  function refreshAll() {
    summary.refresh();
    devices.refresh();
    alerts.refresh();
    compliance.refresh();
    inventory.refresh();
    activity.refresh();
    realtimeOverview.refresh();
    healthEvents.refresh();
    alertLifecycleSummary.refresh();
    activeAlerts.refresh();
    notificationChannels.refresh();
    notificationRules.refresh();
    notificationDeliveries.refresh();
  }

  return (
    <div className="page dashboard-page">
      <div className="page-header dashboard-title-row">
        <div>
          <h2>Enterprise Dashboard</h2>
          <p>Live summary for devices, inventory, compliance, alerts and activity.</p>
        </div>
      </div>

      <DashboardRefreshBar
        enabled={summary.enabled}
        setEnabled={(enabled) => {
          summary.setEnabled(enabled);
          devices.setEnabled(enabled);
          alerts.setEnabled(enabled);
          compliance.setEnabled(enabled);
          inventory.setEnabled(enabled);
          activity.setEnabled(enabled);
          realtimeOverview.setEnabled(enabled);
          healthEvents.setEnabled(enabled);
          alertLifecycleSummary.setEnabled(enabled);
          activeAlerts.setEnabled(enabled);
          notificationChannels.setEnabled(enabled);
          notificationRules.setEnabled(enabled);
          notificationDeliveries.setEnabled(enabled);
        }}
        intervalMs={summary.intervalMs}
        setIntervalMs={(intervalMs) => {
          summary.setIntervalMs(intervalMs);
          devices.setIntervalMs(intervalMs);
          alerts.setIntervalMs(intervalMs);
          compliance.setIntervalMs(intervalMs);
          inventory.setIntervalMs(intervalMs);
          activity.setIntervalMs(intervalMs);
          realtimeOverview.setIntervalMs(intervalMs);
          healthEvents.setIntervalMs(intervalMs);
          alertLifecycleSummary.setIntervalMs(intervalMs);
          activeAlerts.setIntervalMs(intervalMs);
          notificationChannels.setIntervalMs(intervalMs);
          notificationRules.setIntervalMs(intervalMs);
          notificationDeliveries.setIntervalMs(intervalMs);
        }}
        lastUpdatedAt={summary.lastUpdatedAt}
        onRefresh={refreshAll}
      />

      {summary.error ? <div className="error-banner">{summary.error}</div> : null}

      <div className="summary-grid">
        <SummaryCard
          label="Total Devices"
          value={data?.devices.total ?? 0}
          hint="managed routers"
        />
        <SummaryCard label="Online" value={data?.devices.online ?? 0} hint="currently reachable" />
        <SummaryCard label="Offline" value={data?.devices.offline ?? 0} hint="requires attention" />
        <SummaryCard
          label="Warning"
          value={data?.devices.degraded ?? 0}
          hint="health threshold exceeded"
        />
        <SummaryCard
          label="Open Alerts"
          value={data?.alerts.open ?? 0}
          hint={`${data?.alerts.critical ?? 0} critical`}
        />
        <SummaryCard
          label="Compliance"
          value={`${data?.compliance.averageScore ?? 0}%`}
          hint="average score"
        />
        <SummaryCard
          label="Snapshots"
          value={data?.inventory.snapshots ?? 0}
          hint="inventory records"
        />
      </div>

      <DashboardCharts summary={data} realtime={realtimeOverview.data} />

      <HealthDashboardSummary
        overview={realtimeOverview.data}
        events={healthEvents.data ?? []}
        loading={realtimeOverview.loading || healthEvents.loading}
        error={realtimeOverview.error ?? healthEvents.error}
        onRefresh={() => {
          realtimeOverview.refresh();
          healthEvents.refresh();
        }}
      />

      <AlertLifecyclePanel
        summary={alertLifecycleSummary.data}
        alerts={activeAlerts.data ?? []}
        loading={alertLifecycleSummary.loading || activeAlerts.loading}
        error={alertLifecycleSummary.error ?? activeAlerts.error}
        onChanged={() => {
          alertLifecycleSummary.refresh();
          activeAlerts.refresh();
          alerts.refresh();
          activity.refresh();
        }}
      />

      <NotificationPanel
        channels={notificationChannels.data ?? []}
        rules={notificationRules.data ?? []}
        deliveries={notificationDeliveries.data ?? []}
        loading={
          notificationChannels.loading ||
          notificationRules.loading ||
          notificationDeliveries.loading
        }
        error={
          notificationChannels.error ?? notificationRules.error ?? notificationDeliveries.error
        }
        onChanged={() => {
          notificationChannels.refresh();
          notificationRules.refresh();
          notificationDeliveries.refresh();
          activity.refresh();
        }}
      />

      <AuditLogPanel />

      <RbacDashboardSection />
      <AuthSessionDashboardSection />

      <div className="dashboard-grid">
        <WidgetCard title="Device Status" description="Latest managed device states">
          <div className="list">
            {(devices.data?.byStatus ?? []).map((item) => (
              <div className="list-row" key={item.status}>
                <span>{item.status}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
            {!devices.loading && (devices.data?.byStatus.length ?? 0) === 0 ? (
              <p className="muted">No device status yet.</p>
            ) : null}
          </div>
        </WidgetCard>

        <WidgetCard title="Alerts" description="Recent platform alerts">
          <div className="list">
            {(alerts.data?.recent ?? []).slice(0, 6).map((item) => (
              <div className="list-row vertical" key={item.id}>
                <span>{item.title}</span>
                <small>
                  {item.severity} • {item.status}
                </small>
              </div>
            ))}
            {!alerts.loading && (alerts.data?.recent.length ?? 0) === 0 ? (
              <p className="muted">No alerts yet.</p>
            ) : null}
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
            {!compliance.loading && (compliance.data?.recent.length ?? 0) === 0 ? (
              <p className="muted">No compliance reports yet.</p>
            ) : null}
          </div>
        </WidgetCard>

        <WidgetCard title="Inventory" description="Collected inventory statistics">
          <div className="mini-stats">
            <div>
              <span>Sections</span>
              <strong>{inventory.data?.totals.sections ?? 0}</strong>
            </div>
            <div>
              <span>Items</span>
              <strong>{inventory.data?.totals.items ?? 0}</strong>
            </div>
            <div>
              <span>Diffs</span>
              <strong>{inventory.data?.totals.diffs ?? 0}</strong>
            </div>
          </div>
        </WidgetCard>

        <WidgetCard title="Recent Activity" description="Audit and alert timeline">
          <div className="list">
            {(activity.data ?? []).slice(0, 8).map((item) => (
              <div className="list-row vertical" key={`${item.type}-${item.id}`}>
                <span>{item.title}</span>
                <small>
                  {item.type} • {new Date(item.createdAt).toLocaleString()}
                </small>
              </div>
            ))}
            {!activity.loading && (activity.data?.length ?? 0) === 0 ? (
              <p className="muted">No activity yet.</p>
            ) : null}
          </div>
        </WidgetCard>
      </div>
    </div>
  );
}
