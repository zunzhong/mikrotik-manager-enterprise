import { PasswordSecurityPanel } from '../modules/auth/components/PasswordSecurityPanel';
import { AccountProfilePanel } from '../modules/auth/components/AccountProfilePanel';
import { SecuritySessionsPanel } from '../modules/auth/components/SecuritySessionsPanel';
import { SystemStatusPanel } from '../modules/system/components/SystemStatusPanel';
import { LanguageSettingsPanel } from '../modules/settings/LanguageSettingsPanel';
import { useLanguage } from '../i18n/LanguageContext';

export function SettingsPage() {
  const { t } = useLanguage();
  return (
    <div className="page">
      <div className="page-header">
        <h2>{t('settingsTitle')}</h2>
        <p>{t('settingsDescription')}</p>
      </div>

      <AccountProfilePanel />
      <LanguageSettingsPanel />
      <SystemStatusPanel />
      <SecuritySessionsPanel />
      <PasswordSecurityPanel />
    </div>
  );
}
