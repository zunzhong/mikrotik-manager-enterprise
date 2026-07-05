import { DeviceExplorer } from '../modules/devices/components/DeviceExplorer';
import { RouterOsProbePanel } from '../modules/devices/components/RouterOsProbePanel';

export function DevicesPage() {
  return (
    <div className="page">
      <div className="page-header">
        <h2>Devices</h2>
        <p>Manage MikroTik routers and test live RouterOS connectivity.</p>
      </div>

      <RouterOsProbePanel />
      <DeviceExplorer />
    </div>
  );
}
