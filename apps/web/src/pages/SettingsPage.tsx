import { PasswordSecurityPanel } from '../modules/auth/components/PasswordSecurityPanel';
import { SecuritySessionsPanel } from '../modules/auth/components/SecuritySessionsPanel';
import { SystemStatusPanel } from '../modules/system/components/SystemStatusPanel';

export function SettingsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <h2>Settings</h2>
        <p>Configure platform, users, integrations and system preferences.</p>
      </div>

      <SystemStatusPanel />
      <SecuritySessionsPanel />
      <PasswordSecurityPanel />
    </div>
  );
}
