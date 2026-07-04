import { useCallback, useState } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { authApi, type MfaSetupResult } from '../auth.api';

export function MfaSecurityPanel() {
  const status = useAsyncData(useCallback(() => authApi.mfaStatus(), []));
  const [setup, setSetup] = useState<MfaSetupResult | null>(null);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');

  async function startSetup() {
    setMessage('Creating MFA secret...');
    const result = await authApi.mfaSetup();
    setSetup(result);
    setMessage('Use the dev code to enable MFA.');
  }

  async function enable() {
    await authApi.mfaEnable(code);
    setMessage('MFA enabled.');
    setSetup(null);
    setCode('');
    status.refresh();
  }

  async function disable() {
    await authApi.mfaDisable(code);
    setMessage('MFA disabled.');
    setCode('');
    status.refresh();
  }

  return (
    <div className="settings-panel">
      <div className="settings-toolbar">
        <div>
          <h3>MFA / TOTP</h3>
          <p>Protect accounts with authenticator app codes.</p>
        </div>
        <span className="status-badge">{status.data?.enabled ? 'enabled' : 'disabled'}</span>
      </div>

      {message ? <div className="info-banner">{message}</div> : null}

      {!status.data?.enabled ? <button className="small-button" onClick={startSetup}>Setup MFA</button> : null}

      {setup ? (
        <div className="mfa-box">
          <label>Secret</label><code>{setup.secret}</code>
          <label>OTP Auth URI</label><code>{setup.otpauthUrl}</code>
          <label>Dev current code</label><code>{setup.currentCode}</code>
          <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Enter 6-digit code" />
          <button className="small-button" onClick={enable}>Enable MFA</button>
        </div>
      ) : null}

      {status.data?.enabled ? (
        <div className="mfa-box">
          <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Enter MFA code to disable" />
          <button className="small-button danger" onClick={disable}>Disable MFA</button>
        </div>
      ) : null}
    </div>
  );
}
