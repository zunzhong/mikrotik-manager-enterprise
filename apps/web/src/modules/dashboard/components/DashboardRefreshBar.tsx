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
  const { formatDateTime } = useLanguage();
  return (
    <div className="dashboard-refresh-bar">
      <div>
        <strong>Dashboard Refresh</strong>
        <span>
          Last updated: {lastUpdatedAt ? formatDateTime(lastUpdatedAt) : 'not updated yet'}
        </span>
      </div>

      <div className="toolbar-actions">
        <label className="inline-control">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          Auto refresh
        </label>

        <select value={intervalMs} onChange={(event) => setIntervalMs(Number(event.target.value))}>
          <option value={10000}>10s</option>
          <option value={30000}>30s</option>
          <option value={60000}>60s</option>
          <option value={300000}>5m</option>
        </select>

        <button className="small-button" onClick={onRefresh}>
          Refresh Now
        </button>
      </div>
    </div>
  );
}
