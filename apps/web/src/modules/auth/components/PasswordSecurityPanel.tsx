import { useState } from 'react';
import { authApi } from '../auth.api';

export function PasswordSecurityPanel() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  async function changePassword() {
    setMessage('Changing password...');

    try {
      await authApi.changePassword(currentPassword, newPassword);
      setMessage('Password changed. All sessions were revoked.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Password change failed');
    }
  }

  return (
    <div className="settings-panel">
      <div className="settings-toolbar">
        <div>
          <h3>Password Security</h3>
          <p>Change password and enforce enterprise password rules.</p>
        </div>
      </div>

      <div className="password-form">
        <label>Current password</label>
        <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />

        <label>New password</label>
        <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />

        <small>Minimum 8 characters, uppercase, lowercase, number and special character.</small>

        <button className="small-button" onClick={changePassword}>Change Password</button>
      </div>

      {message ? <div className="info-banner">{message}</div> : null}
    </div>
  );
}
