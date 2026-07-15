import { useLanguage } from '../../i18n/LanguageContext';

const commonTimeZones = [
  'Asia/Ho_Chi_Minh',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'UTC',
];

export function TimezoneSettingsPanel() {
  const { t, timeZone, setTimeZone, formatDateTime } = useLanguage();
  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zones = Array.from(new Set([browserTimeZone, timeZone, ...commonTimeZones]));

  return (
    <section className="settings-panel">
      <div className="settings-toolbar">
        <div>
          <h3>{t('timezoneTitle')}</h3>
          <p>{t('timezoneDescription')}</p>
        </div>
      </div>
      <div className="settings-grid timezone-settings">
        <label>
          <span>{t('timezone')}</span>
          <select value={timeZone} onChange={(event) => setTimeZone(event.target.value)}>
            {zones.map((zone) => (
              <option value={zone} key={zone}>
                {zone === browserTimeZone ? `${zone} — ${t('browserTimezone')}` : zone}
              </option>
            ))}
          </select>
        </label>
        <div className="timezone-preview">
          <span>{timeZone}</span>
          <strong>{formatDateTime(new Date())}</strong>
        </div>
      </div>
      <small>{t('savedAutomatically')}</small>
    </section>
  );
}
