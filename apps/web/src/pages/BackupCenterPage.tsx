import { BackupCenter } from '../modules/backup/components/BackupCenter';
import { useLanguage } from '../i18n/LanguageContext';

export function BackupCenterPage() {
  const { tr } = useLanguage();
  return (
    <div className="page">
      <div className="page-header">
        <h2>{tr('Trung tâm sao lưu', 'Backup Center')}</h2>
      </div>

      <BackupCenter />
    </div>
  );
}
