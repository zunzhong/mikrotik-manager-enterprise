import { useLanguage } from '../../../i18n/LanguageContext';

export function DashboardRefreshBar({
  enabled,
  setEnabled,
  intervalMs,
  setIntervalMs,
  lastUpdatedAt,
  onRefresh,
}: {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  intervalMs: number;
  setIntervalMs: (intervalMs: number) => void;
  lastUpdatedAt?: Date;
  onRefresh: () => void;
}) {
  const { formatDateTime, tr } = useLanguage();
  return (
    <div className="dashboard-refresh-bar">
      <div>
        <strong>{tr('Làm mới Dashboard', 'Dashboard Refresh')}</strong>
        <span>
          {tr('Cập nhật lần cuối', 'Last updated')}:{' '}
          {lastUpdatedAt ? formatDateTime(lastUpdatedAt) : tr('chưa cập nhật', 'not updated yet')}
        </span>
      </div>

      <div className="toolbar-actions">
        <label className="inline-control">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          {tr('Tự động làm mới', 'Auto refresh')}
        </label>

        <select value={intervalMs} onChange={(event) => setIntervalMs(Number(event.target.value))}>
          <option value={10000}>10s</option>
          <option value={30000}>30s</option>
          <option value={60000}>60s</option>
          <option value={300000}>5m</option>
        </select>

        <button className="small-button" onClick={onRefresh}>
          {tr('Làm mới ngay', 'Refresh Now')}
        </button>
      </div>
    </div>
  );
}
