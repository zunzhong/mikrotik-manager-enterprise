import { PasswordSecurityPanel } from '../modules/auth/components/PasswordSecurityPanel';
import { AccountProfilePanel } from '../modules/auth/components/AccountProfilePanel';
import { SecuritySessionsPanel } from '../modules/auth/components/SecuritySessionsPanel';
import { SystemStatusPanel } from '../modules/system/components/SystemStatusPanel';

export function SettingsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <h2>Settings</h2>
        <p>Configure platform, users, integrations and system preferences.</p>
      </div>

      <AccountProfilePanel />
      <SystemStatusPanel />
      <SecuritySessionsPanel />
      <PasswordSecurityPanel />
    </div>
  );
}
