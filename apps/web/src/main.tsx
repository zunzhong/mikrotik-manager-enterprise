import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
import { AdministrationPage } from './pages/AdministrationPage';
import { AlertsPage } from './pages/AlertsPage';
import { BackupCenterPage } from './pages/BackupCenterPage';
import { CompliancePage } from './pages/CompliancePage';
import { DashboardPage } from './pages/DashboardPage';
import { DevicesPage } from './pages/DevicesPage';
import { InventoryPage } from './pages/InventoryPage';
import { LoginPage } from './pages/LoginPage';
import { SettingsPage } from './pages/SettingsPage';
import { TopologyPage } from './pages/TopologyPage';
import './styles.css';
import './inventory.css';
import './compliance.css';
import './device-inventory.css';
import './modules/devices/device-dashboard.css';
import './modules/devices/device-interface-explorer.css';
import './backup.css';
import './alerts.css';
import './dashboard-refresh.css';
import './topology.css';
import './settings.css';
import './login.css';
import './password-security.css';
import './mfa.css';
import './rbac.css';
import './routeros-probe.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/compliance" element={<CompliancePage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/backup-center" element={<BackupCenterPage />} />
          <Route path="/topology" element={<TopologyPage />} />
          <Route path="/administration" element={<AdministrationPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
