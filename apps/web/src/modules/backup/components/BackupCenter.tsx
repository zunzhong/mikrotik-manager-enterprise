import { useCallback, useMemo, useState } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { deviceApi } from '../../devices/device.api';
import { backupApi, type BackupRecord } from '../backup.api';
import { useLanguage } from '../../../i18n/LanguageContext';

export function BackupCenter() {
  const { formatDateTime, tr } = useLanguage();
  const devices = useAsyncData(useCallback(() => deviceApi.list(), []));
  const schedules = useAsyncData(useCallback(() => backupApi.schedules(), []));
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [message, setMessage] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [preview, setPreview] = useState<{ fileName: string; content: string } | null>(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleType, setScheduleType] = useState<'export' | 'binary'>('export');
  const [intervalHours, setIntervalHours] = useState(24);

  const activeDeviceId = selectedDeviceId || devices.data?.[0]?.id || '';
  const allDevicesSelected = activeDeviceId === '__all__';
  const backups = useAsyncData(
    useCallback(() => {
      if (!activeDeviceId) return Promise.resolve([]);
      if (allDevicesSelected) {
        return Promise.all((devices.data ?? []).map((device) => backupApi.list(device.id))).then(
          (records) => records.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        );
      }
      return backupApi.list(activeDeviceId);
    }, [activeDeviceId, allDevicesSelected, devices.data]),
  );

  const visibleBackups = useMemo(() => {
    const query = nameFilter.trim().toLowerCase();
    const from = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : -Infinity;
    const to = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : Infinity;
    return (backups.data ?? []).filter((backup) => {
      const createdAt = new Date(backup.createdAt).getTime();
      return (
        (!query || backup.fileName.toLowerCase().includes(query)) &&
        createdAt >= from &&
        createdAt <= to
      );
    });
  }, [backups.data, fromDate, nameFilter, toDate]);

  async function createBackup(type: 'export' | 'binary') {
    if (!activeDeviceId) return setMessage(tr('Chưa chọn thiết bị.', 'No device selected.'));
    setMessage(tr('Đang tạo bản sao lưu...', 'Creating backup...'));
    try {
      const targets = allDevicesSelected
        ? (devices.data ?? []).map((item) => item.id)
        : [activeDeviceId];
      const results = await Promise.allSettled(targets.map((id) => backupApi.create(id, type)));
      const completed = results.filter((result) => result.status === 'fulfilled').length;
      setMessage(
        tr(
          `Đã xử lý ${completed}/${targets.length} thiết bị.`,
          `Processed ${completed}/${targets.length} devices.`,
        ),
      );
      backups.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : tr('Sao lưu thất bại.', 'Backup failed.'),
      );
    }
  }

  async function deleteBackup(backup: BackupRecord) {
    if (!window.confirm(tr(`Xóa ${backup.fileName}?`, `Delete ${backup.fileName}?`))) return;
    try {
      await backupApi.delete(backup.id);
      backups.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : tr('Xóa thất bại.', 'Delete failed.'));
    }
  }

  async function openBackup(backup: BackupRecord) {
    try {
      const result = await backupApi.content(backup.id);
      setPreview({ fileName: result.fileName, content: result.content });
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : tr('Không thể đọc file.', 'Cannot read file.'),
      );
    }
  }

  async function saveSchedule() {
    const targets = allDevicesSelected
      ? (devices.data ?? []).map((item) => item.id)
      : [activeDeviceId];
    if (!targets[0]) return;
    try {
      await Promise.all(
        targets.map((deviceId) =>
          backupApi.configureSchedule(deviceId, {
            enabled: scheduleEnabled,
            type: scheduleType,
            intervalHours,
          }),
        ),
      );
      setMessage(
        tr(
          `Đã lưu auto backup cho ${targets.length} thiết bị.`,
          `Auto backup saved for ${targets.length} devices.`,
        ),
      );
      schedules.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : tr('Không thể lưu lịch.', 'Cannot save schedule.'),
      );
    }
  }

  return (
    <div className="backup-center">
      <div className="backup-toolbar">
        <div>
          <h3>{tr('Trung tâm sao lưu', 'Backup Center')}</h3>
        </div>
        <div className="toolbar-actions">
          <select
            value={activeDeviceId}
            onChange={(event) => setSelectedDeviceId(event.target.value)}
          >
            {(devices.data ?? []).length > 0 ? (
              <option value="__all__">
                {tr('Tất cả thiết bị', 'All devices')} ({devices.data?.length ?? 0})
              </option>
            ) : null}
            {(devices.data ?? []).map((device) => (
              <option value={device.id} key={device.id}>
                {device.name} — {device.host}
              </option>
            ))}
          </select>
          <button className="small-button" onClick={() => void createBackup('export')}>
            Export .rsc
          </button>
          <button className="small-button" onClick={() => void createBackup('binary')}>
            Binary .backup
          </button>
        </div>
      </div>

      {message ? <div className="info-banner">{message}</div> : null}
      {backups.error ? <div className="error-banner">{backups.error}</div> : null}

      <section className="backup-settings">
        <h3>{tr('Cài đặt auto backup', 'Auto backup settings')}</h3>
        <div className="backup-filter-row">
          <label>
            <input
              type="checkbox"
              checked={scheduleEnabled}
              onChange={(event) => setScheduleEnabled(event.target.checked)}
            />{' '}
            {tr('Bật tự động sao lưu', 'Enable auto backup')}
          </label>
          <label>
            {tr('Định dạng', 'Format')}
            <select
              value={scheduleType}
              onChange={(event) => setScheduleType(event.target.value as 'export' | 'binary')}
            >
              <option value="export">.rsc</option>
              <option value="binary">.backup</option>
            </select>
          </label>
          <label>
            {tr('Chu kỳ (giờ)', 'Interval (hours)')}
            <input
              type="number"
              min={1}
              max={8760}
              value={intervalHours}
              onChange={(event) => setIntervalHours(Number(event.target.value))}
            />
          </label>
          <button className="small-button" onClick={() => void saveSchedule()}>
            {tr('Lưu lịch', 'Save schedule')}
          </button>
        </div>
      </section>

      <section className="backup-filters">
        <input
          value={nameFilter}
          onChange={(event) => setNameFilter(event.target.value)}
          placeholder={tr('Lọc theo tên file...', 'Filter by file name...')}
        />
        <label>
          {tr('Từ ngày', 'From')}
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </label>
        <label>
          {tr('Đến ngày', 'To')}
          <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        </label>
      </section>

      <div className="backup-grid">
        {visibleBackups.map((backup) => (
          <article className="backup-card" key={backup.id}>
            <div className="backup-card-header">
              <div>
                <h4>{backup.fileName}</h4>
                <p>
                  {backup.type} • {formatDateTime(backup.createdAt)}
                </p>
              </div>
              <span className={`backup-status backup-${backup.status}`}>{backup.status}</span>
            </div>
            {backup.error ? <div className="error-banner">{backup.error}</div> : null}
            <div className="backup-actions">
              <button
                className="small-button"
                disabled={!backup.storage?.exists}
                title={
                  !backup.storage?.exists
                    ? tr(
                        'File chưa có trong bộ nhớ cục bộ MME',
                        'File is not available in local MME storage',
                      )
                    : undefined
                }
                onClick={() => void backupApi.download(backup.id, backup.fileName)}
              >
                {tr('Tải xuống', 'Download')}
              </button>
              {backup.fileName.toLowerCase().endsWith('.rsc') ? (
                <button className="small-button" onClick={() => void openBackup(backup)}>
                  {tr('Đọc', 'Read')}
                </button>
              ) : null}
              <button className="small-button danger" onClick={() => void deleteBackup(backup)}>
                {tr('Xóa', 'Delete')}
              </button>
            </div>
          </article>
        ))}
        {!backups.loading && visibleBackups.length === 0 ? (
          <div className="empty-state">
            <strong>{tr('Không có bản sao lưu phù hợp', 'No matching backups')}</strong>
          </div>
        ) : null}
      </div>

      {preview ? (
        <div className="backup-preview-overlay" role="dialog" aria-modal="true">
          <div className="backup-preview">
            <header>
              <h3>{preview.fileName}</h3>
              <button type="button" onClick={() => setPreview(null)}>
                {tr('Đóng', 'Close')}
              </button>
            </header>
            <pre>{preview.content}</pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
