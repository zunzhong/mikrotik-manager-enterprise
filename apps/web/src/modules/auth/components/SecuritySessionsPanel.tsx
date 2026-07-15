import { useCallback, useState } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { authApi } from '../auth.api';
import { useLanguage } from '../../../i18n/LanguageContext';

export function SecuritySessionsPanel() {
  const { formatDateTime } = useLanguage();
  const sessions = useAsyncData(useCallback(() => authApi.sessions(), []));
  const [message, setMessage] = useState('');

  async function revoke(id: string) {
    setMessage('Revoking session...');
    await authApi.revokeSession(id);
    setMessage('Session revoked.');
    sessions.refresh();
  }

  async function logoutAll() {
    setMessage('Logging out all sessions...');
    await authApi.logoutAll();
    setMessage('All sessions revoked.');
    sessions.refresh();
  }

  return (
    <div className="settings-panel">
      <div className="settings-toolbar">
        <div>
          <h3>Active Sessions</h3>
          <p>Manage signed-in devices and revoke sessions.</p>
        </div>
        <button className="small-button danger" onClick={logoutAll}>
          Logout All
        </button>
      </div>

      {message ? <div className="info-banner">{message}</div> : null}
      {sessions.error ? <div className="error-banner">{sessions.error}</div> : null}

      <div className="list">
        {(sessions.data ?? []).map((session) => (
          <div className="list-row" key={session.id}>
            <div>
              <strong>{session.userAgent ?? 'Unknown device'}</strong>
              <small>
                {session.ipAddress ?? 'unknown IP'} • last used {formatDateTime(session.lastUsedAt)}
              </small>
            </div>
            {session.revokedAt ? (
              <span className="status-badge">revoked</span>
            ) : (
              <button className="small-button" onClick={() => revoke(session.id)}>
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
