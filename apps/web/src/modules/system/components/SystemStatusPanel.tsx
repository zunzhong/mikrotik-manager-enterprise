import { useCallback } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { systemApi } from '../system.api';

export function SystemStatusPanel() {
  const status = useAsyncData(useCallback(() => systemApi.status(), []));

  return (
    <div className="system-status-panel">
      <div className="settings-toolbar">
        <div>
          <h3>System Status</h3>
          <p>Operational readiness, runtime and platform metrics.</p>
        </div>
        <button className="small-button" onClick={status.refresh}>
          Refresh
        </button>
      </div>

      {status.error ? <div className="error-banner">{status.error}</div> : null}

      <div className="settings-grid">
        <div className="summary-card">
          <span>Service</span>
          <strong>{status.data?.service.name ?? 'MME'}</strong>
          <small>{status.data?.service.environment ?? 'development'}</small>
        </div>
        <div className="summary-card">
          <span>Version</span>
          <strong>{status.data?.service.version ?? '0.1.0'}</strong>
          <small>{status.data?.service.node ?? 'node'}</small>
        </div>
        <div className="summary-card">
          <span>Ready</span>
          <strong>{status.data?.health.ready ? 'Yes' : 'No'}</strong>
          <small>database/runtime checks</small>
        </div>
        <div className="summary-card">
          <span>Devices</span>
          <strong>{status.data?.metrics.devices ?? 0}</strong>
          <small>managed routers</small>
        </div>
        <div className="summary-card">
          <span>Open Alerts</span>
          <strong>{status.data?.metrics.openAlerts ?? 0}</strong>
          <small>active alerts</small>
        </div>
      </div>

      <div className="settings-panel">
        <h3>Health Checks</h3>
        <div className="list">
          {(status.data?.health.checks ?? []).map((check) => (
            <div className="list-row" key={check.name}>
              <span>{check.name}</span>
              <strong>{check.status}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
