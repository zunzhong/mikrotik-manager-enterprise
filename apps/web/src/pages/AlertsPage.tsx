import { useState } from 'react';
import { AlertCenter } from '../modules/alerts/components/AlertCenter';
import { AlertNotificationChannels } from '../modules/alerts/components/AlertNotificationChannels';
import { useLanguage } from '../i18n/LanguageContext';

export function AlertsPage() {
  const { t, tr } = useLanguage();
  const [section, setSection] = useState<'system' | 'center'>('system');
  return (
    <div className="page">
      <div className="page-header">
        <h2>{t('alertCenter')}</h2>
      </div>

      <div className="alert-section-tabs" role="tablist" aria-label={t('alertCenter')}>
        <button
          type="button"
          role="tab"
          aria-selected={section === 'system'}
          className={section === 'system' ? 'active' : ''}
          onClick={() => setSection('system')}
        >
          {tr('Hệ thống', 'System')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={section === 'center'}
          className={section === 'center' ? 'active' : ''}
          onClick={() => setSection('center')}
        >
          {tr('Trung tâm cảnh báo', 'Alert Center')}
        </button>
      </div>

      {section === 'system' ? <AlertNotificationChannels /> : <AlertCenter />}
    </div>
  );
}
