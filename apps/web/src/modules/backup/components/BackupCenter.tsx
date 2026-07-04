import { useCallback, useState } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { deviceApi } from '../../devices/device.api';
import { backupApi, type BackupRecord } from '../backup.api';

export function BackupCenter() {
  const devices = useAsyncData(useCallback(() => deviceApi.list(), []));
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [message, setMessage] = useState('');

  const activeDeviceId = selectedDeviceId || devices.data?.[0]?.id || '';

  const backups = useAsyncData(
    useCallback(() => {
      if (!activeDeviceId) return Promise.resolve([]);
      return backupApi.list(activeDeviceId);
    }, [activeDeviceId]),
  );

  async function createBackup(type: 'export' | 'binary') {
    if (!activeDeviceId) {
      setMessage('No device selected.');
      return;
    }

    setMessage(`Creating ${type} backup...`);

    try {
      const result = await backupApi.create(activeDeviceId, type);
      setMessage(`Backup ${result.status}: ${result.fileName}`);
      backups.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Backup failed');
    }
  }

  async function validateBackup(backup: BackupRecord) {
    setMessage(`Validating ${backup.fileName}...`);

    try {
      const result = await backupApi.validate(backup.id);
      setMessage(result.valid ? 'Backup validation passed.' : `Validation warning: ${result.warnings.join(', ')}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Validation failed');
    }
  }

  async function deleteBackup(backup: BackupRecord) {
    setMessage(`Deleting ${backup.fileName}...`);

    try {
      await backupApi.delete(backup.id);
      setMessage('Backup record deleted.');
      backups.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Delete failed');
    }
  }

  return (
    <div className="backup-center">
      <div className="backup-toolbar">
        <div>
          <h3>Backup Center</h3>
          <p>Create, validate and manage RouterOS backup/export records.</p>
        </div>

        <div className="toolbar-actions">
          <select value={activeDeviceId} onChange={(event) => setSelectedDeviceId(event.target.value)}>
            {(devices.data ?? []).map((device) => (
              <option value={device.id} key={device.id}>
                {device.name} — {device.host}
              </option>
            ))}
            {(devices.data ?? []).length === 0 ? <option value="">No devices</option> : null}
          </select>

          <button className="small-button" onClick={() => createBackup('export')}>Export .rsc</button>
          <button className="small-button" onClick={() => createBackup('binary')}>Binary .backup</button>
        </div>
      </div>

      {message ? <div className="info-banner">{message}</div> : null}
      {backups.error ? <div className="error-banner">{backups.error}</div> : null}

      <div className="backup-grid">
        {(backups.data ?? []).map((backup) => (
          <article className="backup-card" key={backup.id}>
            <div className="backup-card-header">
              <div>
                <h4>{backup.fileName}</h4>
                <p>{backup.type} • {new Date(backup.createdAt).toLocaleString()}</p>
              </div>
              <span className={`backup-status backup-${backup.status}`}>{backup.status}</span>
            </div>

            <div className="backup-meta">
              <span>Checksum</span>
              <code>{backup.checksum ?? 'not available'}</code>
            </div>

            {backup.error ? <div className="error-banner">{backup.error}</div> : null}

            <div className="backup-actions">
              <button className="small-button" onClick={() => validateBackup(backup)}>Validate</button>
              <button className="small-button danger" onClick={() => deleteBackup(backup)}>Delete</button>
            </div>
          </article>
        ))}

        {!backups.loading && (backups.data?.length ?? 0) === 0 ? (
          <div className="empty-state">
            <strong>No backups yet</strong>
            <p>Create an export or binary backup for the selected device.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
