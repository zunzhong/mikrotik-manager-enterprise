import { Outlet } from 'react-router-dom';

export function AppShell() {
  return (
    <div className="app-shell">
      <aside>Enterprise Sidebar</aside>
      <main>
        <header>MikroTik Manager Enterprise</header>
        <Outlet />
      </main>
    </div>
  );
}
