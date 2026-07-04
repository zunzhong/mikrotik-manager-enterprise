import { useCallback, useMemo, useState } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { deviceApi } from '../../devices/device.api';
import { complianceApi } from '../compliance.api';

export function ComplianceCenter() {
  const policies = useAsyncData(useCallback(() => complianceApi.policies(), []));
  const devices = useAsyncData(useCallback(() => deviceApi.list(), []));
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [scanMessage, setScanMessage] = useState('');
  const activeDeviceId = selectedDeviceId || devices.data?.[0]?.id || '';
  const reports = useAsyncData(useCallback(() => activeDeviceId ? complianceApi.reports(activeDeviceId) : Promise.resolve([]), [activeDeviceId]));
  const latestReport = reports.data?.[0];

  const severityCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const policy of policies.data ?? []) counts.set(policy.severity, (counts.get(policy.severity) ?? 0) + 1);
    return Array.from(counts.entries()).map(([severity, count]) => ({ severity, count }));
  }, [policies.data]);

  async function runScan() {
    if (!activeDeviceId) { setScanMessage('No device selected.'); return; }
    setScanMessage('Running compliance scan...');
    try {
      const report = await complianceApi.scan(activeDeviceId);
      setScanMessage(`Scan completed: ${report.status} / ${report.score}%`);
      reports.refresh();
    } catch (error) {
      setScanMessage(error instanceof Error ? error.message : 'Scan failed');
    }
  }

  return (
    <div className="compliance-center">
      <div className="compliance-toolbar">
        <div><h3>Compliance Center</h3><p>Review policy rules and run compliance scans.</p></div>
        <div className="toolbar-actions">
          <select value={activeDeviceId} onChange={(event) => setSelectedDeviceId(event.target.value)}>
            {(devices.data ?? []).map((device) => <option value={device.id} key={device.id}>{device.name} — {device.host}</option>)}
            {(devices.data ?? []).length === 0 ? <option value="">No devices</option> : null}
          </select>
          <button className="small-button" onClick={runScan}>Run Scan</button>
        </div>
      </div>

      {policies.error ? <div className="error-banner">{policies.error}</div> : null}
      {reports.error ? <div className="error-banner">{reports.error}</div> : null}
      {scanMessage ? <div className="info-banner">{scanMessage}</div> : null}

      <div className="compliance-grid">
        <section className="compliance-panel">
          <h3>Policy Registry</h3>
          <div className="mini-stats">
            {severityCounts.map((item) => <div key={item.severity}><span>{item.severity}</span><strong>{item.count}</strong></div>)}
          </div>
          <div className="policy-list">
            {(policies.data ?? []).map((policy) => (
              <article className="policy-card" key={policy.key}>
                <div><h4>{policy.title}</h4><p>{policy.description}</p></div>
                <span className={`severity severity-${policy.severity}`}>{policy.severity}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="compliance-panel">
          <h3>Latest Report</h3>
          {!latestReport ? (
            <div className="empty-state"><strong>No compliance report yet</strong><p>Run a scan after collecting inventory.</p></div>
          ) : (
            <>
              <div className="score-card"><span>Score</span><strong>{latestReport.score}%</strong><p>{latestReport.status}</p></div>
              <div className="result-list">
                {latestReport.results.map((result) => (
                  <article className="result-card" key={result.id}>
                    <div><h4>{result.policyKey}</h4><p>{result.message}</p></div>
                    <span className={`result result-${result.status}`}>{result.status}</span>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
