import { useState } from 'react';
import { deviceApi, type Device, type DeviceActionResult } from '../device.api';
import { backupApi } from '../../backup/backup.api';

export interface DeviceQuickActionsProps {
  device: Device;
  onInventoryCollected?: () => void;
}

function resultText(result: DeviceActionResult): string {
  const finished = new Date(result.finishedAt).toLocaleString();
  return `${result.success ? 'Hoàn tất' : 'Thất bại'} lúc ${finished} (${result.durationMs} ms) — ${result.message}`;
}

export function DeviceQuickActions({ device, onInventoryCollected }: DeviceQuickActionsProps) {
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState<boolean | null>(null);
  const [busyAction, setBusyAction] = useState('');

  async function runAction(action: string, fn: () => Promise<DeviceActionResult>) {
    setBusyAction(action);
    setSuccess(null);
    setMessage(`${action}: đang thực hiện...`);
    try {
      const result = await fn();
      setSuccess(result.success);
      setMessage(resultText(result));
    } catch (error) {
      setSuccess(false);
      setMessage(error instanceof Error ? error.message : `${action} thất bại`);
    } finally {
      setBusyAction('');
    }
  }

  async function collectInventory() {
    setBusyAction('Inventory');
    setMessage('Đang đồng bộ Inventory...');
    try {
      const result = await deviceApi.collectInventory(device.id);
      onInventoryCollected?.();
      setSuccess(true);
      setMessage(
        `Đã đồng bộ Inventory lúc ${new Date().toLocaleString()} — mã lần thu thập ${result.snapshotId}.`,
      );
    } catch (error) {
      setSuccess(false);
      setMessage(error instanceof Error ? error.message : 'Đồng bộ Inventory thất bại.');
    } finally {
      setBusyAction('');
    }
  }

  function pingFromDevice() {
    const address = window.prompt('Nhập IP hoặc DDNS mà router sẽ ping tới:', '8.8.8.8')?.trim();
    if (!address) return;
    void runAction('Router ping tới đích', () =>
      deviceApi.pingFromDevice(device.id, { address, count: 4 }),
    );
  }

  function createBackup() {
    if (!window.confirm(`Tạo file backup mới trên ${device.name}?`)) return;
    void runAction('Tạo bản sao lưu', async () => {
      const startedAt = new Date().toISOString();
      const backup = await backupApi.create(device.id, 'binary');
      const finishedAt = backup.completedAt ?? new Date().toISOString();
      return {
        action: 'create-backup',
        success: backup.status === 'completed',
        startedAt,
        finishedAt,
        durationMs: new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
        message:
          backup.status === 'completed'
            ? `Đã tạo ${backup.fileName}`
            : (backup.error ?? `Trạng thái: ${backup.status}`),
        data: backup,
      };
    });
  }

  function createSupout() {
    if (!window.confirm(`Tạo file supout trên ${device.name}? Quá trình có thể mất một lúc.`))
      return;
    void runAction('Tạo Supout', () => deviceApi.generateSupout(device.id, { confirm: true }));
  }

  function reboot() {
    if (!window.confirm(`Khởi động lại ${device.name}? Kết nối sẽ bị gián đoạn.`)) return;
    void runAction('Khởi động lại', () => deviceApi.rebootDevice(device.id, true));
  }

  return (
    <section className="device-quick-actions">
      <div className="device-quick-actions__header">
        <div>
          <h3>Thao tác nhanh</h3>
          <p>Thao tác trực tiếp trên {device.name}; mọi kết quả đều kèm thời gian hoàn tất.</p>
        </div>
      </div>
      <div className="device-quick-actions__grid">
        <button
          type="button"
          onClick={() => void collectInventory()}
          disabled={Boolean(busyAction)}
        >
          {busyAction === 'Inventory' ? 'Đang thu thập...' : 'Thu thập Inventory'}
        </button>
        <button
          type="button"
          onClick={() =>
            void runAction('Ping tới thiết bị', () => deviceApi.pingToDevice(device.id))
          }
          disabled={Boolean(busyAction)}
        >
          {busyAction === 'Ping tới thiết bị' ? 'Đang ping...' : 'Ping tới thiết bị'}
        </button>
        <button type="button" onClick={pingFromDevice} disabled={Boolean(busyAction)}>
          {busyAction === 'Router ping tới đích' ? 'Đang ping...' : 'Router ping tới IP/DDNS'}
        </button>
        <button type="button" onClick={createBackup} disabled={Boolean(busyAction)}>
          {busyAction === 'Tạo bản sao lưu' ? 'Đang tạo...' : 'Tạo bản sao lưu'}
        </button>
        <button type="button" onClick={createSupout} disabled={Boolean(busyAction)}>
          {busyAction === 'Tạo Supout' ? 'Đang tạo...' : 'Tạo file Supout'}
        </button>
        <button
          className="danger-action"
          type="button"
          onClick={reboot}
          disabled={Boolean(busyAction)}
        >
          {busyAction === 'Khởi động lại' ? 'Đang gửi lệnh...' : 'Khởi động lại router'}
        </button>
      </div>
      {message ? (
        <div className="device-quick-actions__message" data-success={success}>
          {message}
        </div>
      ) : null}
    </section>
  );
}
