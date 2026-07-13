import { useState } from 'react';
import { deviceApi, type RouterOsProbeResult } from '../device.api';

interface RouterOsProbePanelProps {
  onDeviceAdded?: () => void;
}

function connectionFingerprint(input: {
  host: string;
  port: number;
  username: string;
  password: string;
  useTls: boolean;
}): string {
  return JSON.stringify(input);
}

export function RouterOsProbePanel({ onDeviceAdded }: RouterOsProbePanelProps) {
  const [host, setHost] = useState('192.168.88.1');
  const [port, setPort] = useState(8728);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [useTls, setUseTls] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [result, setResult] = useState<RouterOsProbeResult | null>(null);
  const [message, setMessage] = useState('');
  const [testedFingerprint, setTestedFingerprint] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentFingerprint = connectionFingerprint({ host, port, username, password, useTls });
  const canAdd = result?.online === true && testedFingerprint === currentFingerprint;

  function selectProtocol(tls: boolean) {
    setUseTls(tls);
    setPort((currentPort) => {
      if (currentPort === 8728 || currentPort === 8729) return tls ? 8729 : 8728;
      return currentPort;
    });
    setResult(null);
    setTestedFingerprint(null);
  }

  async function probe() {
    setMessage('Testing RouterOS connection...');
    setResult(null);
    setTestedFingerprint(null);
    setTesting(true);

    try {
      const fingerprint = connectionFingerprint({ host, port, username, password, useTls });
      const data = await deviceApi.probe({
        host,
        port,
        username,
        password,
        useTls,
        rejectUnauthorized: false,
        timeoutMs: 15000,
      });
      setResult(data);
      if (data.online) {
        setTestedFingerprint(fingerprint);
        setDeviceName((current) => current || data.identity || host);
      }
      setMessage(data.online ? 'RouterOS device is online.' : 'RouterOS device is offline.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Probe failed');
    } finally {
      setTesting(false);
    }
  }

  async function addDevice() {
    if (!canAdd || !deviceName.trim()) return;

    setSaving(true);
    setMessage('Saving device...');
    try {
      await deviceApi.create({
        name: deviceName.trim(),
        host,
        port,
        username,
        password,
        useTls,
        loginMode: 'auto',
      });
      setMessage(`Device ${deviceName.trim()} was added successfully.`);
      setTestedFingerprint(null);
      onDeviceAdded?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Cannot add device');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="routeros-probe-panel">
      <div className="probe-header">
        <div>
          <h3>RouterOS Live Probe</h3>
          <p>Test connection and read live identity/resource/routerboard information.</p>
        </div>
        <button className="small-button" disabled={testing} onClick={probe} type="button">
          {testing ? 'Testing...' : 'Test Connection'}
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
        <label>
          Protocol
          <select
            value={useTls ? 'api-ssl' : 'api'}
            onChange={(event) => selectProtocol(event.target.value === 'api-ssl')}
          >
            <option value="api">API (TCP)</option>
            <option value="api-ssl">API-SSL (TLS)</option>
          </select>
        </label>
      </div>

      {message ? <div className="info-banner">{message}</div> : null}

      {result ? (
        <>
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

          {result.online ? (
            <div className="probe-add-device">
              <label>
                Device name
                <input
                  value={deviceName}
                  onChange={(event) => setDeviceName(event.target.value)}
                  placeholder="Router name in MME"
                />
              </label>
              <div>
                <strong>{useTls ? 'API-SSL (TLS)' : 'API (TCP)'}</strong>
                <small>
                  {host}:{port} · credentials will be encrypted before storage
                </small>
              </div>
              <button
                className="small-button"
                disabled={!canAdd || saving || !deviceName.trim()}
                onClick={addDevice}
                type="button"
              >
                {saving ? 'Adding...' : 'Add Device'}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
