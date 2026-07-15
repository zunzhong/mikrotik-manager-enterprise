import { useCallback } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { backupApi } from '../../backup/backup.api';
import { useLanguage } from '../../../i18n/LanguageContext';

export function DeviceBackupsPanel({ deviceId }: { deviceId: string }) {
  const { formatDateTime } = useLanguage();
  const backups = useAsyncData(useCallback(() => backupApi.list(deviceId), [deviceId]));
  return (
    <section className="device-subpanel">
      <header>
        <div>
          <p className="device-dashboard__eyebrow">Backup History</p>
          <h3>File backup của thiết bị</h3>
        </div>
        <button className="small-button" type="button" onClick={() => backups.refresh()}>
          Làm mới
        </button>
      </header>
      <div className="device-backup-list">
        {(backups.data ?? []).map((backup) => (
          <article key={backup.id}>
            <div>
              <strong>{backup.fileName}</strong>
              <small>
                {backup.type} · {formatDateTime(backup.createdAt)}
              </small>
            </div>
            <span
              className={`status-badge status-${backup.status === 'completed' ? 'online' : backup.status === 'failed' ? 'offline' : 'unknown'}`}
            >
              {backup.status}
            </span>
          </article>
        ))}
      </div>
      {!backups.loading && (backups.data?.length ?? 0) === 0 ? (
        <div className="empty-state">Chưa có bản backup nào.</div>
      ) : null}
    </section>
  );
}
