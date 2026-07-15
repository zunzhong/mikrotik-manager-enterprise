import { useEffect, useMemo, useState } from 'react';
import { deviceApi } from './device.api';
import type { InventorySnapshotSummary } from './device-inventory.types';
import { formatBytes, formatMaybe, snapshotSummary } from './device-dashboard.utils';
import { useLanguage } from '../../i18n/LanguageContext';

export interface DeviceDashboardProps {
  deviceId: string;
}

export function DeviceDashboard({ deviceId }: DeviceDashboardProps) {
  const { formatDateTime } = useLanguage();
  const [snapshot, setSnapshot] = useState<InventorySnapshotSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadLatest() {
    setLoading(true);
    setError(null);

    try {
      setSnapshot(await deviceApi.latestInventorySnapshot(deviceId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot load inventory snapshot');
    } finally {
      setLoading(false);
    }
  }

  async function syncNow() {
    setSyncing(true);
    setError(null);

    try {
      await deviceApi.collectInventory(deviceId);
      await loadLatest();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot sync inventory');
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    void loadLatest();
  }, [deviceId]);

  const info = useMemo(() => snapshotSummary(snapshot), [snapshot]);
  const systemGroups = useMemo(() => buildSystemGroups(snapshot?.summary), [snapshot]);

  if (loading) {
    return (
      <section className="device-dashboard">
        <div className="device-dashboard__card">Loading device dashboard...</div>
      </section>
    );
  }

  return (
    <section className="device-dashboard">
      <header className="device-dashboard__header">
        <div>
          <p className="device-dashboard__eyebrow">Device Dashboard</p>
          <h2>{info.identity}</h2>
          <p className="device-dashboard__muted">
            Latest inventory:{' '}
            {snapshot?.collectedAt ? formatDateTime(snapshot.collectedAt) : 'No snapshot yet'}
          </p>
        </div>

        <button
          className="device-dashboard__button"
          type="button"
          onClick={() => void syncNow()}
          disabled={syncing}
        >
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </header>

      {error ? <div className="device-dashboard__error">{error}</div> : null}

      <div className="device-dashboard__grid">
        <MetricCard label="RouterOS" value={formatMaybe(info.version)} />
        <MetricCard label="Architecture" value={formatMaybe(info.architecture)} />
        <MetricCard label="Board" value={formatMaybe(info.board)} />
        <MetricCard label="Serial" value={formatMaybe(info.serial)} />
        <MetricCard label="Uptime" value={formatMaybe(info.uptime)} />
        <MetricCard label="CPU Load" value={info.cpuLoad ? `${info.cpuLoad}%` : 'N/A'} />
        <MetricCard
          label="Free Memory"
          value={`${formatBytes(info.freeMemory)} / ${formatBytes(info.totalMemory)}`}
        />
        <MetricCard
          label="Free Disk"
          value={`${formatBytes(info.freeDisk)} / ${formatBytes(info.totalDisk)}`}
        />
      </div>

      <details className="device-dashboard__card device-dashboard__details">
        <summary>Xem chi tiết hệ thống và firmware</summary>
        <div className="device-dashboard__grid detail-metrics">
          <MetricCard label="CPU" value={formatMaybe(info.cpu)} />
          <MetricCard label="CPU Cores" value={formatMaybe(info.cpuCount)} />
          <MetricCard
            label="CPU Frequency"
            value={info.cpuFrequency ? `${info.cpuFrequency} MHz` : 'N/A'}
          />
          <MetricCard label="Platform" value={formatMaybe(info.platform)} />
          <MetricCard label="Build Time" value={formatMaybe(info.buildTime)} />
          <MetricCard label="Current Firmware" value={formatMaybe(info.currentFirmware)} />
          <MetricCard label="Upgrade Firmware" value={formatMaybe(info.upgradeFirmware)} />
        </div>
        <div className="system-detail-groups">
          {systemGroups.map((group) => (
            <section key={group.name}>
              <h4>{group.name}</h4>
              <dl>
                {group.values.map(([key, value]) => (
                  <div key={key}>
                    <dt>{humanLabel(key)}</dt>
                    <dd>{String(value ?? '—')}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </details>

      <details className="device-dashboard__card device-dashboard__details">
        <summary>Xem danh sách section Inventory</summary>
        {snapshot?.sections?.length ? (
          <table className="device-dashboard__table">
            <thead>
              <tr>
                <th>Section</th>
                <th>Category</th>
                <th>Path</th>
                <th>Items</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.sections.map((section) => (
                <tr key={section.id}>
                  <td>{section.name}</td>
                  <td>{section.category}</td>
                  <td>{section.path}</td>
                  <td>{section.itemCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="device-dashboard__muted">
            No inventory snapshot yet. Click Sync Now to collect data.
          </p>
        )}
      </details>
    </section>
  );
}

function buildSystemGroups(
  summary: unknown,
): Array<{ name: string; values: Array<[string, unknown]> }> {
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) return [];
  const source = summary as Record<string, unknown>;
  const groups: Array<{ name: string; values: Array<[string, unknown]> }> = [];
  for (const key of ['identity', 'resource', 'routerboard']) {
    const value = source[key];
    if (value && typeof value === 'object' && !Array.isArray(value))
      groups.push({
        name: humanLabel(key),
        values: Object.entries(value as Record<string, unknown>),
      });
  }
  const health = source.health;
  if (Array.isArray(health)) {
    groups.push({
      name: 'Health Sensors',
      values: health.flatMap((row, index) =>
        row && typeof row === 'object'
          ? Object.entries(row as Record<string, unknown>).map(
              ([key, value]) => [`${index + 1}.${key}`, value] as [string, unknown],
            )
          : [],
      ),
    });
  }
  return groups;
}

function humanLabel(value: string): string {
  return value
    .replace(/^\d+\./, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="device-dashboard__card">
      <p className="device-dashboard__label">{label}</p>
      <strong>{value}</strong>
    </article>
  );
}
