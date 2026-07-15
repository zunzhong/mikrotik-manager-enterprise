import { useState } from 'react';
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zones = Array.from(new Set([browserTimeZone, timeZone, ...commonTimeZones]));

  async function selectTimeZone(value: string) {
    setSaving(true);
    setError(null);
    try {
      await setTimeZone(value);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu múi giờ hệ thống.');
    } finally {
      setSaving(false);
    }
  }

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
          <select
            value={timeZone}
            disabled={saving}
            onChange={(event) => void selectTimeZone(event.target.value)}
          >
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
      {error ? <p className="settings-error">{error}</p> : null}
    </section>
  );
}
