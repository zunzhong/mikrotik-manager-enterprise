import { AlertCenter } from '../modules/alerts/components/AlertCenter';
import { AlertNotificationChannels } from '../modules/alerts/components/AlertNotificationChannels';
import { useLanguage } from '../i18n/LanguageContext';

export function AlertsPage() {
  const { t } = useLanguage();
  return (
    <div className="page">
      <div className="page-header">
        <h2>{t('alertCenter')}</h2>
        <p>{t('alertDescription')}</p>
      </div>

      <AlertCenter />
      <div className="alert-notification-section">
        <div className="section-heading">
          <span>DELIVERY ENGINE</span>
          <h2>{t('notificationChannels')}</h2>
          <p>Cấu hình, kiểm thử và theo dõi lịch sử gửi cảnh báo từ cùng một nơi.</p>
        </div>
        <AlertNotificationChannels />
      </div>
    </div>
  );
}
