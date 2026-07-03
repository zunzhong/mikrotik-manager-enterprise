import { DeviceExplorer } from '../modules/devices/components/DeviceExplorer';

export function DevicesPage() {
  return (
    <div className="page">
      <div className="page-header">
        <h2>Device Explorer</h2>
        <p>Manage MikroTik routers and explore RouterOS inventory like an enterprise console.</p>
      </div>

      <DeviceExplorer />
    </div>
  );
}
