import { useState } from 'react';
import { deviceApi, type RouterOsProbeResult } from '../device.api';

export function RouterOsProbePanel() {
  const [host, setHost] = useState('192.168.88.1');
  const [port, setPort] = useState(8728);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [useTls, setUseTls] = useState(false);
  const [result, setResult] = useState<RouterOsProbeResult | null>(null);
  const [message, setMessage] = useState('');

  async function probe() {
    setMessage('Testing RouterOS connection...');
    setResult(null);

    try {
      const data = await deviceApi.probe({ host, port, username, password, useTls });
      setResult(data);
      setMessage(data.online ? 'RouterOS device is online.' : 'RouterOS device is offline.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Probe failed');
    }
  }

  return (
    <section className="routeros-probe-panel">
      <div className="probe-header">
        <div>
          <h3>RouterOS Live Probe</h3>
          <p>Test connection and read live identity/resource/routerboard information.</p>
        </div>
        <button className="small-button" onClick={probe}>
          Test Connection
        </button>
      </div>

      <div className="probe-form">
        <label>
          Host
          <input value={host} onChange={(event) => setHost(event.target.value)} />
        </label>
        <label>
          Port
          <input
            type="number"
            value={port}
            onChange={(event) => setPort(Number(event.target.value))}
          />
        </label>
        <label>
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={useTls}
            onChange={(event) => setUseTls(event.target.checked)}
          />
          Use API-SSL
        </label>
      </div>

      {message ? <div className="info-banner">{message}</div> : null}

      {result ? (
        <div className="probe-result">
          <div className="summary-card">
            <span>Status</span>
            <strong>{result.online ? 'Online' : 'Offline'}</strong>
            <small>{result.error ?? 'connection result'}</small>
          </div>
          <div className="summary-card">
            <span>Latency</span>
            <strong>{result.latencyMs ?? 0} ms</strong>
            <small>round trip</small>
          </div>
          <div className="summary-card">
            <span>Identity</span>
            <strong>{result.identity ?? 'unknown'}</strong>
            <small>system identity</small>
          </div>
          <div className="summary-card">
            <span>RouterOS</span>
            <strong>{result.version ?? 'unknown'}</strong>
            <small>{result.architecture ?? 'architecture unknown'}</small>
          </div>
          <div className="summary-card">
            <span>Board</span>
            <strong>{result.boardName ?? 'unknown'}</strong>
            <small>{result.serialNumber ?? 'serial unknown'}</small>
          </div>
          <div className="summary-card">
            <span>Uptime</span>
            <strong>{result.uptime ?? 'unknown'}</strong>
            <small>reported by router</small>
          </div>
        </div>
      ) : null}
    </section>
  );
}
