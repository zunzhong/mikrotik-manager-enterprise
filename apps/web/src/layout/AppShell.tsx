import { NavLink, Outlet } from 'react-router-dom';
import { navigationItems } from './navigation';
import { useTheme } from '../theme/useTheme';

export function AppShell() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app-shell" data-theme={theme}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">MME</div>
          <div>
            <strong>MikroTik Manager</strong>
            <span>Enterprise</span>
          </div>
        </div>

        <nav className="nav">
          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
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
