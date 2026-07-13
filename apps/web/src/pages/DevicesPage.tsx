import { useState } from 'react';
import { DeviceExplorer } from '../modules/devices/components/DeviceExplorer';
import { RouterOsProbePanel } from '../modules/devices/components/RouterOsProbePanel';

export function DevicesPage() {
  const [deviceRevision, setDeviceRevision] = useState(0);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Devices</h2>
        <p>Manage MikroTik routers and test live RouterOS connectivity.</p>
      </div>

      <RouterOsProbePanel onDeviceAdded={() => setDeviceRevision((value) => value + 1)} />
      <DeviceExplorer key={deviceRevision} />
    </div>
  );
}
