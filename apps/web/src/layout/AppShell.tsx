import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { createNavigationItems } from './navigation';
import { useTheme } from '../theme/useTheme';
import { useEffect, useMemo, useState } from 'react';
import { authApi, type AuthUser } from '../modules/auth/auth.api';
import { useLanguage } from '../i18n/LanguageContext';

export function AppShell() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const navigationItems = useMemo(() => createNavigationItems(t), [t]);
  const hasToken = Boolean(window.localStorage.getItem('mme-token'));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.localStorage.getItem('mme-sidebar-collapsed') === 'true',
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [devicesExpanded, setDevicesExpanded] = useState(false);

  useEffect(() => {
    if (!hasToken) return undefined;
    void authApi
      .me()
      .then(setUser)
      .catch(() => undefined);
    const onProfileUpdated = (event: Event) => {
      const detail = (event as CustomEvent<AuthUser>).detail;
      if (detail) setUser(detail);
    };
    window.addEventListener('mme-profile-updated', onProfileUpdated);
    return () => window.removeEventListener('mme-profile-updated', onProfileUpdated);
  }, [hasToken]);

  useEffect(() => {
    if (!location.pathname.startsWith('/devices')) setDevicesExpanded(false);
  }, [location.pathname]);

  async function logout() {
    await authApi.logout().catch(() => undefined);
    window.localStorage.removeItem('mme-token');
    window.localStorage.removeItem('mme-refresh-token');
    navigate('/login', { replace: true });
  }

  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div
      className={`app-shell ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`}
      data-theme={theme}
    >
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand">
          <img className="brand-logo" src="/brand/mme-logo-192.png" alt="MME" />
          <div>
            <strong>MikroTik Manager</strong>
            <span>Enterprise</span>
          </div>
        </div>

        <button
          className="sidebar-collapse"
          type="button"
          onClick={() => {
            const next = !sidebarCollapsed;
            setSidebarCollapsed(next);
            window.localStorage.setItem('mme-sidebar-collapsed', String(next));
          }}
          aria-label={sidebarCollapsed ? t('expandMenu') : t('collapseMenu')}
          title={sidebarCollapsed ? t('expandMenu') : t('collapseMenu')}
        >
          {sidebarCollapsed ? '>>' : '<<'}
        </button>

        <nav className="nav">
          {navigationItems.map((item) => (
            <div
              className={`nav-entry ${item.children ? 'has-children' : ''} ${item.children && devicesExpanded ? 'expanded' : ''}`}
              key={item.path}
            >
              {item.children ? (
                <button
                  type="button"
                  className={`nav-item nav-parent ${location.pathname.startsWith('/devices') ? 'active' : ''}`}
                  aria-expanded={devicesExpanded}
                  onClick={() => setDevicesExpanded((current) => !current)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                  <span className="nav-flyout-arrow" aria-hidden="true">
                    <svg viewBox="0 0 20 20" focusable="false">
                      <path d="m5.5 7.5 4.5 4.5 4.5-4.5" />
                    </svg>
                  </span>
                </button>
              ) : (
                <NavLink
                  to={item.path}
                  onClick={() => setDevicesExpanded(false)}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              )}
              {item.children && devicesExpanded ? (
                <div className="nav-children">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      onClick={() => setDevicesExpanded(false)}
                      className={({ isActive }) => `nav-child ${isActive ? 'active' : ''}`}
                    >
                      <span>{child.icon}</span>
                      <span className="nav-label">{child.label}</span>
                    </NavLink>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>

        <footer className="sidebar-footer">
          <strong>Copyright @ BUI QUANG CHINH</strong>
          <span>Hotline: 0901351754</span>
        </footer>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-spacer" />
          <div className="topbar-account">
            <button
              className="theme-switch"
              type="button"
              onClick={toggleTheme}
              aria-label={t('themeToggle')}
              title={theme === 'dark' ? t('lightMode') : t('darkMode')}
              data-active-theme={theme}
            >
              <span className="theme-switch__moon" aria-hidden="true">
                ☾
              </span>
              <b aria-hidden="true">/</b>
              <span className="theme-switch__sun" aria-hidden="true">
                ☀
              </span>
            </button>
            <div className="account-identity">
              <span>{t('adminAccount')}</span>
              <strong>{user?.name || user?.email || t('signedIn')}</strong>
            </div>
            <button className="logout-button" type="button" onClick={() => void logout()}>
              {t('logout')}
            </button>
          </div>
        </header>

        <section className="content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
