import { useCallback, useState } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { deviceApi } from '../../devices/device.api';
import { alertApi, type AlertRecord } from '../alert.api';

export function AlertCenter() {
  const rules = useAsyncData(useCallback(() => alertApi.rules(), []));
  const alerts = useAsyncData(useCallback(() => alertApi.list(), []));
  const devices = useAsyncData(useCallback(() => deviceApi.list(), []));

  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [message, setMessage] = useState('');

  const activeDeviceId = selectedDeviceId || devices.data?.[0]?.id || '';

  async function evaluateAll() {
    setMessage('Evaluating all alert rules...');
    try {
      const result = await alertApi.evaluateAll();
      setMessage(`Evaluation completed: ${result.triggered} alerts triggered.`);
      alerts.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Evaluation failed');
    }
  }

  async function evaluateDevice() {
    if (!activeDeviceId) {
      setMessage('No device selected.');
      return;
    }

    setMessage('Evaluating selected device...');
    try {
      const result = await alertApi.evaluateDevice(activeDeviceId);
      setMessage(`Device evaluation completed: ${result.triggered} alerts triggered.`);
      alerts.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Device evaluation failed');
    }
  }

  async function acknowledge(alert: AlertRecord) {
    setMessage(`Acknowledging ${alert.title}...`);
    try {
      await alertApi.acknowledge(alert.id);
      setMessage('Alert acknowledged.');
      alerts.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Acknowledge failed');
    }
  }

  const openCount = (alerts.data ?? []).filter((item) => item.status === 'open').length;
  const criticalCount = (alerts.data ?? []).filter((item) => item.severity === 'critical' && item.status === 'open').length;

  return (
    <div className="alert-center">
      <div className="alert-toolbar">
        <div>
          <h3>Alert Center</h3>
          <p>Evaluate alert rules, review alerts and acknowledge incidents.</p>
        </div>

        <div className="toolbar-actions">
          <select value={activeDeviceId} onChange={(event) => setSelectedDeviceId(event.target.value)}>
            {(devices.data ?? []).map((device) => (
              <option value={device.id} key={device.id}>
                {device.name} — {device.host}
              </option>
            ))}
            {(devices.data ?? []).length === 0 ? <option value="">No devices</option> : null}
          </select>
          <button className="small-button" onClick={evaluateDevice}>Evaluate Device</button>
          <button className="small-button" onClick={evaluateAll}>Evaluate All</button>
        </div>
      </div>

      {message ? <div className="info-banner">{message}</div> : null}
      {rules.error ? <div className="error-banner">{rules.error}</div> : null}
      {alerts.error ? <div className="error-banner">{alerts.error}</div> : null}

      <div className="alert-summary">
        <div className="summary-card">
          <span>Open Alerts</span>
          <strong>{openCount}</strong>
          <small>active incidents</small>
        </div>
        <div className="summary-card">
          <span>Critical</span>
          <strong>{criticalCount}</strong>
          <small>requires attention</small>
        </div>
        <div className="summary-card">
          <span>Rules</span>
          <strong>{rules.data?.length ?? 0}</strong>
          <small>alert rule registry</small>
        </div>
      </div>

      <div className="alert-grid">
        <section className="alert-panel">
          <h3>Alert Rules</h3>
          <div className="rule-list">
            {(rules.data ?? []).map((rule) => (
              <article className="rule-card" key={rule.key}>
                <div>
                  <h4>{rule.title}</h4>
                  <p>{rule.description}</p>
                  <small>{rule.source} • {rule.key}</small>
                </div>
                <span className={`alert-severity sev-${rule.severity}`}>{rule.severity}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="alert-panel">
          <h3>Alerts</h3>
          <div className="alert-list">
            {(alerts.data ?? []).map((alert) => (
              <article className="alert-card" key={alert.id}>
                <div className="alert-card-header">
                  <div>
                    <h4>{alert.title}</h4>
                    <p>{alert.message}</p>
                    <small>{alert.source} • {new Date(alert.createdAt).toLocaleString()}</small>
                  </div>
                  <div className="alert-badges">
                    <span className={`alert-severity sev-${alert.severity}`}>{alert.severity}</span>
                    <span className={`alert-status status-${alert.status}`}>{alert.status}</span>
                  </div>
                </div>

                {alert.status === 'open' ? (
                  <button className="small-button" onClick={() => acknowledge(alert)}>Acknowledge</button>
                ) : null}
              </article>
            ))}

            {!alerts.loading && (alerts.data?.length ?? 0) === 0 ? (
              <div className="empty-state">
                <strong>No alerts yet</strong>
                <p>Run evaluation to generate alerts from current inventory, compliance and backup data.</p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
