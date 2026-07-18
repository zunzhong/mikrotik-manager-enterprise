import { useState } from 'react';
import { useLanguage, type Language } from '../../i18n/LanguageContext';

export function LanguageSettingsPanel() {
  const { language, setLanguage, t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function selectLanguage(value: Language) {
    setSaving(true);
    setError(null);
    try {
      await setLanguage(value);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu ngôn ngữ hệ thống.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="settings-panel language-settings-panel">
      <div className="settings-toolbar">
        <div>
          <span className="settings-eyebrow">{t('language')}</span>
          <h3>{t('languageTitle')}</h3>
          <p>{t('languageDescription')}</p>
        </div>
        <span className="language-current">{language === 'vi' ? 'VI' : 'EN'}</span>
      </div>

      <div className="language-options" role="radiogroup" aria-label={t('languageTitle')}>
        {(
          [
            ['vi', '🇻🇳', t('vietnamese')],
            ['en', '🇬🇧', t('english')],
          ] as Array<[Language, string, string]>
        ).map(([value, flag, label]) => (
          <button
            type="button"
            role="radio"
            aria-checked={language === value}
            className={language === value ? 'active' : ''}
            disabled={saving}
            onClick={() => void selectLanguage(value)}
            key={value}
          >
            <span>{flag}</span>
            <strong>{label}</strong>
            <small>{value === 'vi' ? 'Vietnamese' : 'English'}</small>
          </button>
        ))}
      </div>
      {error ? <p className="settings-error">{error}</p> : null}
    </section>
  );
}
