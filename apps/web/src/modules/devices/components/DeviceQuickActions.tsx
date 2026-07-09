import { useState } from 'react';
import { deviceApi, type Device } from '../device.api';

export interface DeviceQuickActionsProps {
  device: Device;
  onInventoryCollected?: () => void;
}

export function DeviceQuickActions({ device, onInventoryCollected }: DeviceQuickActionsProps) {
  const [message, setMessage] = useState<string>('');
  const [busyAction, setBusyAction] = useState<string>('');

  async function runAction(
    action: string,
    fn: () => Promise<{ message: string; success?: boolean }>,
  ) {
    setBusyAction(action);
    setMessage(`${action} running...`);

    try {
      const result = await fn();
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `${action} failed`);
    } finally {
      setBusyAction('');
    }
  }

  async function collectInventory() {
    await runAction('Inventory', async () => {
      await deviceApi.collectInventory(device.id);
      onInventoryCollected?.();
      return { message: 'Inventory collection completed.', success: true };
    });
  }

  async function ping() {
    await runAction('Ping', () =>
      deviceApi.pingDevice(device.id, { address: device.host, count: 4 }),
    );
  }

  async function backup() {
    await runAction('Backup', () => deviceApi.createBackup(device.id));
  }

  async function supout() {
    await runAction('Supout', () => deviceApi.generateSupout(device.id));
  }

  async function reboot() {
    const confirmed = window.confirm(`Reboot ${device.name}? This will interrupt connectivity.`);
    if (!confirmed) return;

    await runAction('Reboot', () => deviceApi.rebootDevice(device.id, true));
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
          disabled={busyAction === 'Inventory'}
        >
          {busyAction === 'Inventory' ? 'Collecting...' : 'Collect Inventory'}
        </button>

        <button type="button" onClick={() => void ping()} disabled={busyAction === 'Ping'}>
          {busyAction === 'Ping' ? 'Pinging...' : 'Ping'}
        </button>

        <button type="button" onClick={() => void backup()} disabled={busyAction === 'Backup'}>
          {busyAction === 'Backup' ? 'Creating...' : 'Backup'}
        </button>

        <button type="button" onClick={() => void supout()} disabled={busyAction === 'Supout'}>
          {busyAction === 'Supout' ? 'Generating...' : 'Supout'}
        </button>

        <button type="button" onClick={() => comingSoon('Safe Mode')}>
          Safe Mode
        </button>

        <button type="button" onClick={() => void reboot()} disabled={busyAction === 'Reboot'}>
          {busyAction === 'Reboot' ? 'Sending...' : 'Reboot'}
        </button>
      </div>

      {message ? <div className="device-quick-actions__message">{message}</div> : null}
    </section>
  );
}
