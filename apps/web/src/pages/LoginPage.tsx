import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../modules/auth/auth.api';
import { useTheme } from '../theme/useTheme';
import { useLanguage } from '../i18n/LanguageContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function login() {
    setMessage(t('signingIn'));

    try {
      const result = await authApi.login(email, password);
      window.localStorage.setItem('mme-token', result.accessToken ?? result.token ?? '');
      setMessage(`Signed in as ${result.user?.email ?? email}`);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('loginFailed'));
    }
  }

  return (
    <div className="login-page" data-theme={theme}>
      <div className="login-card">
        <div className="login-preferences">
          <button
            type="button"
            className="theme-switch"
            data-active-theme={theme}
            onClick={toggleTheme}
            aria-label={t('themeToggle')}
          >
            <span className="theme-switch__moon">☾</span>
            <b>/</b>
            <span className="theme-switch__sun">☀</span>
          </button>
          <button type="button" onClick={() => void setLanguage(language === 'vi' ? 'en' : 'vi')}>
            {language.toUpperCase()}
          </button>
        </div>
        <div className="brand">
          <img className="brand-logo" src="/brand/mme-logo-192.png" alt="MME" />
          <div>
            <strong>MikroTik Manager</strong>
            <span>Enterprise</span>
          </div>
        </div>

        <h1>{t('login')}</h1>
        <p>{t('loginDescription')}</p>

        <label>{t('account')}</label>
        <input value={email} onChange={(event) => setEmail(event.target.value)} />

        <label>{t('password')}</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void login();
          }}
        />

        <button className="theme-toggle" onClick={login}>
          {t('login')}
        </button>

        {message ? <div className="info-banner">{message}</div> : null}
        <a href="/setup">{t('preflight')}</a>
      </div>
    </div>
  );
}
