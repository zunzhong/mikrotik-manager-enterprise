import { useLanguage } from '../i18n/LanguageContext';
import { SyslogCenter } from '../modules/syslog/SyslogCenter';

export function SyslogPage() {
  const { tr } = useLanguage();
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Syslog</h2>
          <p>
            {tr(
              'Thu thập, tìm kiếm và lưu trữ tập trung log của thiết bị mạng.',
              'Collect, search and retain network-device logs centrally.',
            )}
          </p>
        </div>
      </div>
      <SyslogCenter />
    </div>
  );
}
