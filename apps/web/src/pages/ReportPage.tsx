import { useLanguage } from '../i18n/LanguageContext';
import { ReportCenter } from '../modules/report/ReportCenter';

export function ReportPage() {
  const { tr } = useLanguage();
  return (
    <div className="page">
      <div className="page-header">
        <h2>{tr('Báo cáo', 'Reports')}</h2>
      </div>
      <ReportCenter />
    </div>
  );
}
