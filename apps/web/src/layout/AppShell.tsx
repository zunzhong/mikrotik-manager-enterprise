import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { navigationItems } from './navigation';
import { useTheme } from '../theme/useTheme';
import { useEffect, useState } from 'react';
import { authApi, type AuthUser } from '../modules/auth/auth.api';

export function AppShell() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const hasToken = Boolean(window.localStorage.getItem('mme-token'));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.localStorage.getItem('mme-sidebar-collapsed') === 'true',
  );
  const [user, setUser] = useState<AuthUser | null>(null);

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
          aria-label={sidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          title={sidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
        >
          {sidebarCollapsed ? '›' : '‹'}
        </button>

        <nav className="nav">
          {navigationItems.map((item) => (
            <div className={`nav-entry ${item.children ? 'has-children' : ''}`} key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {item.children ? <span className="nav-flyout-arrow">⌄</span> : null}
              </NavLink>
              {item.children ? (
                <div className="nav-children">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.path}
                      to={child.path}
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
            <button className="theme-toggle" type="button" onClick={toggleTheme}>
              {theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
            </button>
            <div className="account-identity">
              <span>Tài khoản quản trị</span>
              <strong>{user?.name || user?.email || 'Đang đăng nhập'}</strong>
            </div>
            <button className="logout-button" type="button" onClick={() => void logout()}>
              Đăng xuất
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
