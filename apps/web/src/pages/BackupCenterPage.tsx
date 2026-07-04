import { BackupCenter } from '../modules/backup/components/BackupCenter';

export function BackupCenterPage() {
  return (
    <div className="page">
      <div className="page-header">
        <h2>Backup Center</h2>
        <p>Manage RouterOS exports, binary backups, validation and retention workflows.</p>
      </div>

      <BackupCenter />
    </div>
  );
}
