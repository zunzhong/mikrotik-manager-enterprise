import { Link, Navigate, NavLink, Outlet } from 'react-router-dom';
import { navigationItems } from './navigation';
import { useTheme } from '../theme/useTheme';
import { useEffect, useState } from 'react';
import { deviceApi, type Device } from '../modules/devices/device.api';

export function AppShell() {
  const { theme, toggleTheme } = useTheme();
  const hasToken = Boolean(window.localStorage.getItem('mme-token'));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.localStorage.getItem('mme-sidebar-collapsed') === 'true',
  );
  const [devices, setDevices] = useState<Device[]>([]);

  useEffect(() => {
    if (!hasToken) return undefined;
    const refresh = () =>
      deviceApi
        .list()
        .then(setDevices)
        .catch(() => undefined);
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30000);
    return () => window.clearInterval(timer);
  }, [hasToken]);

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
          <div className="brand-mark">MME</div>
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
            <div
              className={`nav-entry ${item.path === '/devices' ? 'has-flyout' : ''}`}
              key={item.path}
            >
              <NavLink
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {item.path === '/devices' ? <span className="nav-flyout-arrow">›</span> : null}
              </NavLink>
              {item.path === '/devices' ? (
                <div className="device-nav-flyout">
                  <strong>Thiết bị quản lý</strong>
                  {devices.map((device) => (
                    <Link key={device.id} to={`/devices?device=${encodeURIComponent(device.id)}`}>
                      <span>{device.name}</span>
                      <small>
                        {device.host}:{device.port}
                      </small>
                    </Link>
                  ))}
                  {devices.length === 0 ? <small>Chưa có thiết bị</small> : null}
                </div>
              ) : null}
            </div>
          ))}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>MikroTik Manager Enterprise</h1>
            <p>Network automation, inventory, compliance and monitoring platform</p>
          </div>

          <button className="theme-toggle" type="button" onClick={toggleTheme}>
            {theme === 'dark' ? 'Light' : 'Dark'} Mode
          </button>
        </header>

        <section className="content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
