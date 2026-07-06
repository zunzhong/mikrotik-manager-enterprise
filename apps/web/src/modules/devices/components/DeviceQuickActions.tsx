import { useState } from 'react';
import { deviceApi, type Device } from '../device.api';

export interface DeviceQuickActionsProps {
  device: Device;
  onInventoryCollected?: () => void;
}

export function DeviceQuickActions({ device, onInventoryCollected }: DeviceQuickActionsProps) {
  const [message, setMessage] = useState<string>('');
  const [busyAction, setBusyAction] = useState<string>('');

  async function collectInventory() {
    setBusyAction('inventory');
    setMessage('Collecting inventory...');

    try {
      await deviceApi.collectInventory(device.id);
      setMessage('Inventory collection completed.');
      onInventoryCollected?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Inventory collection failed');
    } finally {
      setBusyAction('');
    }
  }

  function comingSoon(action: string) {
    setMessage(`${action} will be connected in an upcoming sprint.`);
  }

  return (
    <section className="device-quick-actions">
      <div className="device-quick-actions__header">
        <div>
          <h3>Quick Actions</h3>
          <p>Run common management operations for this router.</p>
        </div>
      </div>

      <div className="device-quick-actions__grid">
        <button
          type="button"
          onClick={() => void collectInventory()}
          disabled={busyAction === 'inventory'}
        >
          {busyAction === 'inventory' ? 'Collecting...' : 'Collect Inventory'}
        </button>

        <button type="button" onClick={() => comingSoon('Ping')}>
          Ping
        </button>

        <button type="button" onClick={() => comingSoon('Backup')}>
          Backup
        </button>

        <button type="button" onClick={() => comingSoon('Open Terminal')}>
          Open Terminal
        </button>

        <button type="button" onClick={() => comingSoon('Safe Mode')}>
          Safe Mode
        </button>

        <button type="button" onClick={() => comingSoon('Reboot')}>
          Reboot
        </button>
      </div>

      {message ? <div className="device-quick-actions__message">{message}</div> : null}
    </section>
  );
}
