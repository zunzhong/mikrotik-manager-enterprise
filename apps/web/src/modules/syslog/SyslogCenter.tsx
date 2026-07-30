import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { syslogApi } from './syslog.api';
import type {
  SyslogFilters,
  SyslogMessagePage,
  SyslogOverview,
  SyslogSettings,
} from './syslog.types';

const SEVERITIES = [
  'Emergency',
  'Alert',
  'Critical',
  'Error',
  'Warning',
  'Notice',
  'Informational',
  'Debug',
];

const FACILITIES = [
  'kernel',
  'user',
  'mail',
  'daemon',
  'auth',
  'syslog',
  'lpr',
  'news',
  'uucp',
  'clock',
  'authpriv',
  'ftp',
  'ntp',
  'audit',
  'alert',
  'clock2',
  'local0',
  'local1',
  'local2',
  'local3',
  'local4',
  'local5',
  'local6',
  'local7',
];

const emptyPage = (): SyslogMessagePage => ({
  items: [],
  total: 0,
  page: 1,
  pageSize: 50,
  pages: 1,
});

export function SyslogCenter() {
  const { formatDateTime, tr } = useLanguage();
  const [overview, setOverview] = useState<SyslogOverview | null>(null);
  const [messages, setMessages] = useState<SyslogMessagePage>(emptyPage);
  const [settings, setSettings] = useState<SyslogSettings | null>(null);
  const [filters, setFilters] = useState<SyslogFilters>({ page: 1, pageSize: 50 });
  const [searchInput, setSearchInput] = useState('');
  const [live, setLive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [serverAddress, setServerAddress] = useState(() => window.location.hostname);
  const [routerPort, setRouterPort] = useState(514);
  const [topics, setTopics] = useState('info,!account,!debug');
  const [alias, setAlias] = useState('');
  const [aliasDeviceId, setAliasDeviceId] = useState('');

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const [nextOverview, nextMessages] = await Promise.all([
          syslogApi.overview(),
          syslogApi.messages(filters),
        ]);
        setOverview(nextOverview);
        setMessages(nextMessages);
        setSettings((current) => current ?? nextOverview.settings);
        setAliasDeviceId((current) => current || nextOverview.devices[0]?.id || '');
        setError(null);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : tr('Không tải được dữ liệu Syslog.', 'Unable to load Syslog data.'),
        );
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [filters, tr],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!live) return undefined;
    const timer = window.setInterval(() => void load(true), 5000);
    return () => window.clearInterval(timer);
  }, [live, load]);

  const allSelected = Boolean(
    overview?.devices.length &&
    overview.devices.every((device) => selectedDevices.includes(device.id)),
  );

  const severitySummary = useMemo(
    () =>
      (overview?.bySeverity ?? [])
        .filter((item) => item.count > 0)
        .map((item) => `${SEVERITIES[item.severity]}: ${item.count.toLocaleString()}`)
        .join(' · '),
    [overview],
  );

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    if (!settings) return;
    setBusy('settings');
    setNotice(null);
    setError(null);
    try {
      const result = await syslogApi.saveSettings(settings);
      setSettings(result.settings);
      setNotice(
        tr(
          'Đã lưu cấu hình và khởi động lại bộ nhận Syslog.',
          'Settings saved and the Syslog receiver restarted.',
        ),
      );
      await load(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save Syslog settings.');
    } finally {
      setBusy(null);
    }
  }

  async function testReceiver() {
    setBusy('test');
    setNotice(null);
    setError(null);
    try {
      const result = await syslogApi.test();
      if (!result.success) throw new Error(result.message);
      setNotice(result.message);
      await load(true);
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : 'Syslog receiver test failed.');
    } finally {
      setBusy(null);
    }
  }

  async function configureRouters(event: FormEvent) {
    event.preventDefault();
    if (selectedDevices.length === 0) {
      setError(tr('Hãy chọn ít nhất một thiết bị.', 'Select at least one device.'));
      return;
    }
    if (
      !window.confirm(
        tr(
          `MME sẽ tạo/cập nhật action “mme-syslog” trên ${selectedDevices.length} thiết bị. Tiếp tục?`,
          `MME will create or update the “mme-syslog” action on ${selectedDevices.length} device(s). Continue?`,
        ),
      )
    )
      return;
    setBusy('routeros');
    setNotice(null);
    setError(null);
    try {
      const result = await syslogApi.configureRouterOs({
        deviceIds: selectedDevices,
        serverAddress,
        port: routerPort,
        topics,
        confirm: true,
      });
      const failed = result.results
        .filter((item) => !item.success)
        .map((item) => `${item.deviceName}: ${item.error}`)
        .join(' · ');
      setNotice(
        tr(
          `Cấu hình thành công ${result.succeeded}/${result.results.length} thiết bị.`,
          `Configured ${result.succeeded}/${result.results.length} device(s).`,
        ),
      );
      if (failed) setError(failed);
    } catch (configureError) {
      setError(
        configureError instanceof Error
          ? configureError.message
          : 'Unable to configure RouterOS Syslog.',
      );
    } finally {
      setBusy(null);
    }
  }

  async function saveAlias(event: FormEvent) {
    event.preventDefault();
    if (!alias || !aliasDeviceId) return;
    setBusy('alias');
    setError(null);
    try {
      await syslogApi.addAlias(alias, aliasDeviceId);
      setAlias('');
      setNotice(tr('Đã lưu ánh xạ nguồn Syslog.', 'Syslog source mapping saved.'));
      await load(true);
    } catch (aliasError) {
      setError(aliasError instanceof Error ? aliasError.message : 'Unable to save source mapping.');
    } finally {
      setBusy(null);
    }
  }

  async function purgeNow() {
    setBusy('purge');
    setError(null);
    try {
      const result = await syslogApi.purge();
      setNotice(
        tr(
          `Đã xóa ${result.total.toLocaleString()} log hết hạn/vượt giới hạn.`,
          `Deleted ${result.total.toLocaleString()} expired/overflow log records.`,
        ),
      );
      await load(true);
    } catch (purgeError) {
      setError(purgeError instanceof Error ? purgeError.message : 'Unable to purge Syslog data.');
    } finally {
      setBusy(null);
    }
  }

  async function clearAll() {
    if (
      !window.confirm(
        tr(
          'Xóa toàn bộ Syslog đã lưu? Thao tác này không thể hoàn tác.',
          'Delete every stored Syslog message? This cannot be undone.',
        ),
      )
    )
      return;
    setBusy('clear');
    setError(null);
    try {
      const result = await syslogApi.clear();
      setNotice(
        tr(
          `Đã xóa ${result.deleted.toLocaleString()} log.`,
          `Deleted ${result.deleted.toLocaleString()} log records.`,
        ),
      );
      await load(true);
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : 'Unable to clear Syslog data.');
    } finally {
      setBusy(null);
    }
  }

  if (loading && !overview)
    return <div className="syslog-loading">{tr('Đang tải Syslog...', 'Loading Syslog...')}</div>;

  const receiver = overview?.receiver;
  return (
    <div className="syslog-center">
      {error ? <div className="syslog-banner is-error">{error}</div> : null}
      {notice ? <div className="syslog-banner is-success">{notice}</div> : null}

      <section className="syslog-summary">
        <article>
          <span>{tr('Bộ nhận', 'Receiver')}</span>
          <strong className={receiver?.running ? 'is-online' : 'is-offline'}>
            {receiver?.running ? tr('Đang chạy', 'Running') : tr('Đã dừng', 'Stopped')}
          </strong>
          <small>
            {receiver?.bindAddress}:{receiver?.port} ·{' '}
            {[receiver?.udpListening ? 'UDP' : '', receiver?.tcpListening ? 'TCP' : '']
              .filter(Boolean)
              .join(' + ') || '—'}
          </small>
        </article>
        <article>
          <span>{tr('24 giờ qua', 'Last 24 hours')}</span>
          <strong>{overview?.last24Hours.toLocaleString() ?? 0}</strong>
          <small>{severitySummary || tr('Chưa có log', 'No logs yet')}</small>
        </article>
        <article>
          <span>{tr('Tổng lưu trữ', 'Stored')}</span>
          <strong>{overview?.total.toLocaleString() ?? 0}</strong>
          <small>
            {tr('Hàng đợi', 'Queue')}: {receiver?.queueDepth ?? 0} · {tr('Đã bỏ', 'Dropped')}:{' '}
            {receiver?.dropped ?? 0}
          </small>
        </article>
        <article>
          <span>{tr('Chưa gán thiết bị', 'Unmatched')}</span>
          <strong>{overview?.unmatched.toLocaleString() ?? 0}</strong>
          <small>
            {overview?.lastMessageAt
              ? formatDateTime(overview.lastMessageAt)
              : tr('Chưa nhận dữ liệu', 'No data received')}
          </small>
        </article>
      </section>

      {receiver?.lastError ? (
        <div className="syslog-banner is-warning">{receiver.lastError}</div>
      ) : null}

      <details className="syslog-panel syslog-configuration">
        <summary>{tr('Cấu hình bộ nhận và lưu trữ', 'Receiver and storage settings')}</summary>
        {settings ? (
          <form className="syslog-settings-grid" onSubmit={(event) => void saveSettings(event)}>
            <label className="syslog-check">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })}
              />
              {tr('Bật bộ nhận Syslog', 'Enable Syslog receiver')}
            </label>
            <label className="syslog-check">
              <input
                type="checkbox"
                checked={settings.udpEnabled}
                onChange={(event) => setSettings({ ...settings, udpEnabled: event.target.checked })}
              />
              UDP
            </label>
            <label className="syslog-check">
              <input
                type="checkbox"
                checked={settings.tcpEnabled}
                onChange={(event) => setSettings({ ...settings, tcpEnabled: event.target.checked })}
              />
              TCP
            </label>
            <label>
              {tr('Địa chỉ lắng nghe', 'Bind address')}
              <input
                value={settings.bindAddress}
                onChange={(event) => setSettings({ ...settings, bindAddress: event.target.value })}
              />
            </label>
            <label>
              {tr('Cổng Syslog', 'Syslog port')}
              <input
                type="number"
                min={1}
                max={65535}
                value={settings.port}
                onChange={(event) => setSettings({ ...settings, port: Number(event.target.value) })}
              />
            </label>
            <label>
              {tr('Lưu tối đa (ngày)', 'Retention (days)')}
              <input
                type="number"
                min={1}
                max={3650}
                value={settings.retentionDays}
                onChange={(event) =>
                  setSettings({ ...settings, retentionDays: Number(event.target.value) })
                }
              />
            </label>
            <label>
              {tr('Số log tối đa', 'Maximum records')}
              <input
                type="number"
                min={1000}
                max={10000000}
                value={settings.maxRecords}
                onChange={(event) =>
                  setSettings({ ...settings, maxRecords: Number(event.target.value) })
                }
              />
            </label>
            <label className="syslog-check">
              <input
                type="checkbox"
                checked={settings.acceptUnmatched}
                onChange={(event) =>
                  setSettings({ ...settings, acceptUnmatched: event.target.checked })
                }
              />
              {tr('Lưu cả nguồn chưa gán', 'Store unmatched sources')}
            </label>
            <div className="syslog-actions">
              <button type="submit" disabled={busy === 'settings'}>
                {tr('Lưu và khởi động lại', 'Save and restart')}
              </button>
              <button type="button" onClick={() => void testReceiver()} disabled={busy === 'test'}>
                {tr('Kiểm thử đầu-cuối', 'End-to-end test')}
              </button>
              <button type="button" onClick={() => void purgeNow()} disabled={busy === 'purge'}>
                {tr('Dọn log ngay', 'Purge now')}
              </button>
              <button
                className="is-danger"
                type="button"
                onClick={() => void clearAll()}
                disabled={busy === 'clear'}
              >
                {tr('Xóa toàn bộ log', 'Clear all logs')}
              </button>
            </div>
          </form>
        ) : null}
        <p className="syslog-hint">
          {tr(
            'Linux/Windows Firewall phải cho phép cổng đã chọn trên cả UDP/TCP. Bộ cài tự mở cổng mặc định 514.',
            'Linux/Windows Firewall must allow the selected UDP/TCP port. The installer opens default port 514.',
          )}
        </p>
      </details>

      <details className="syslog-panel syslog-configuration">
        <summary>{tr('Cấu hình thiết bị RouterOS tự động', 'Configure RouterOS devices')}</summary>
        <form onSubmit={(event) => void configureRouters(event)}>
          <div className="syslog-router-grid">
            <label>
              {tr(
                'IP/hostname máy MME mà router truy cập được',
                'MME IP/hostname reachable by routers',
              )}
              <input
                required
                value={serverAddress}
                onChange={(event) => setServerAddress(event.target.value)}
              />
            </label>
            <label>
              {tr('Cổng UDP', 'UDP port')}
              <input
                type="number"
                min={1}
                max={65535}
                value={routerPort}
                onChange={(event) => setRouterPort(Number(event.target.value))}
              />
            </label>
            <label>
              RouterOS topics
              <input value={topics} onChange={(event) => setTopics(event.target.value)} />
            </label>
          </div>
          <label className="syslog-check">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(event) =>
                setSelectedDevices(
                  event.target.checked ? (overview?.devices.map((device) => device.id) ?? []) : [],
                )
              }
            />
            {tr('Chọn toàn bộ thiết bị', 'Select all devices')}
          </label>
          <div className="syslog-device-picker">
            {overview?.devices.map((device) => (
              <label key={device.id}>
                <input
                  type="checkbox"
                  checked={selectedDevices.includes(device.id)}
                  onChange={(event) =>
                    setSelectedDevices((current) =>
                      event.target.checked
                        ? [...new Set([...current, device.id])]
                        : current.filter((id) => id !== device.id),
                    )
                  }
                />
                <strong>{device.name}</strong>
                <span>{device.host}</span>
              </label>
            ))}
          </div>
          <button type="submit" disabled={busy === 'routeros'}>
            {tr('Cấu hình Syslog trên RouterOS', 'Configure RouterOS Syslog')}
          </button>
        </form>
      </details>

      <section className="syslog-panel">
        <div className="syslog-panel-heading">
          <div>
            <h3>{tr('Nhật ký tập trung', 'Centralized logs')}</h3>
            <span>{messages.total.toLocaleString()} logs</span>
          </div>
          <label className="syslog-check">
            <input
              type="checkbox"
              checked={live}
              onChange={(event) => setLive(event.target.checked)}
            />
            {tr('Tự làm mới 5 giây', 'Refresh every 5 seconds')}
          </label>
        </div>
        <form
          className="syslog-filters"
          onSubmit={(event) => {
            event.preventDefault();
            setFilters((current) => ({ ...current, page: 1, search: searchInput || undefined }));
          }}
        >
          <input
            aria-label={tr('Tìm trong log', 'Search logs')}
            placeholder={tr(
              'Tìm message, hostname, IP, chương trình...',
              'Search message, host, IP, app...',
            )}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <select
            value={filters.deviceId ?? ''}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                page: 1,
                deviceId: event.target.value || undefined,
              }))
            }
          >
            <option value="">{tr('Tất cả thiết bị', 'All devices')}</option>
            <option value="unmatched">{tr('Chưa gán thiết bị', 'Unmatched sources')}</option>
            {overview?.devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </select>
          <select
            value={filters.severity ?? ''}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                page: 1,
                severity: event.target.value === '' ? undefined : Number(event.target.value),
              }))
            }
          >
            <option value="">{tr('Mọi mức độ', 'All severities')}</option>
            {SEVERITIES.map((label, severity) => (
              <option key={label} value={severity}>
                {severity} · {label}
              </option>
            ))}
          </select>
          <select
            value={filters.facility ?? ''}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                page: 1,
                facility: event.target.value === '' ? undefined : Number(event.target.value),
              }))
            }
          >
            <option value="">{tr('Mọi facility', 'All facilities')}</option>
            {FACILITIES.map((label, facility) => (
              <option key={label} value={facility}>
                {facility} · {label}
              </option>
            ))}
          </select>
          <select
            value={filters.protocol ?? ''}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                page: 1,
                protocol: (event.target.value as SyslogFilters['protocol']) || undefined,
              }))
            }
          >
            <option value="">{tr('Mọi giao thức', 'All protocols')}</option>
            <option value="udp">UDP</option>
            <option value="tcp">TCP</option>
            <option value="internal">Internal</option>
          </select>
          <button type="submit">{tr('Tìm kiếm', 'Search')}</button>
          <button
            type="button"
            onClick={() => {
              setSearchInput('');
              setFilters({ page: 1, pageSize: 50 });
            }}
          >
            {tr('Đặt lại', 'Reset')}
          </button>
        </form>

        <div className="syslog-table-wrap">
          <table className="syslog-table">
            <thead>
              <tr>
                <th>{tr('Thời gian', 'Time')}</th>
                <th>{tr('Thiết bị / nguồn', 'Device / source')}</th>
                <th>{tr('Mức độ', 'Severity')}</th>
                <th>Facility / App</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {messages.items.map((message) => (
                <tr key={message.id}>
                  <td>
                    <time dateTime={message.receivedAt}>{formatDateTime(message.receivedAt)}</time>
                    <small>{message.protocol.toUpperCase()}</small>
                  </td>
                  <td>
                    <strong>
                      {message.device?.name ?? message.hostname ?? message.sourceAddress}
                    </strong>
                    <small>
                      {message.sourceAddress}
                      {message.sourcePort ? `:${message.sourcePort}` : ''}
                    </small>
                  </td>
                  <td>
                    <span className={`syslog-severity severity-${message.severity}`}>
                      {message.severityLabel}
                    </span>
                    <small>PRI {message.priority}</small>
                  </td>
                  <td>
                    <strong>{message.facilityLabel}</strong>
                    <small>{message.appName ?? message.tag ?? '—'}</small>
                  </td>
                  <td className="syslog-message-cell">
                    <div>{message.message}</div>
                    <details>
                      <summary>{tr('Dữ liệu gốc', 'Raw data')}</summary>
                      <pre>{message.rawMessage}</pre>
                    </details>
                  </td>
                </tr>
              ))}
              {messages.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="syslog-empty">
                    {tr(
                      'Chưa có log phù hợp. Hãy cấu hình RouterOS gửi Syslog tới địa chỉ và cổng ở trên.',
                      'No matching logs. Configure RouterOS to send Syslog to the address and port above.',
                    )}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="syslog-pagination">
          <button
            type="button"
            disabled={messages.page <= 1}
            onClick={() =>
              setFilters((current) => ({ ...current, page: Math.max(1, messages.page - 1) }))
            }
          >
            ← {tr('Trước', 'Previous')}
          </button>
          <span>
            {tr('Trang', 'Page')} {messages.page}/{messages.pages}
          </span>
          <button
            type="button"
            disabled={messages.page >= messages.pages}
            onClick={() =>
              setFilters((current) => ({
                ...current,
                page: Math.min(messages.pages, messages.page + 1),
              }))
            }
          >
            {tr('Sau', 'Next')} →
          </button>
        </div>
      </section>

      <details className="syslog-panel syslog-configuration">
        <summary>
          {tr('Ánh xạ hostname/IP khác tên thiết bị', 'Map alternate hostname/IP to a device')}
        </summary>
        <form className="syslog-alias-form" onSubmit={(event) => void saveAlias(event)}>
          <input
            required
            placeholder={tr('Hostname hoặc IP nhận được', 'Received hostname or IP')}
            value={alias}
            onChange={(event) => setAlias(event.target.value)}
          />
          <select value={aliasDeviceId} onChange={(event) => setAliasDeviceId(event.target.value)}>
            {overview?.devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name} · {device.host}
              </option>
            ))}
          </select>
          <button type="submit" disabled={busy === 'alias'}>
            {tr('Lưu ánh xạ', 'Save mapping')}
          </button>
        </form>
        <div className="syslog-alias-list">
          {overview?.aliases.map((item) => (
            <span key={item.id}>
              <code>{item.alias}</code> → {item.device.name}
              <button
                type="button"
                aria-label={tr('Xóa ánh xạ', 'Delete mapping')}
                onClick={() =>
                  void syslogApi
                    .deleteAlias(item.id)
                    .then(() => load(true))
                    .catch((aliasError: unknown) =>
                      setError(
                        aliasError instanceof Error
                          ? aliasError.message
                          : 'Unable to delete mapping.',
                      ),
                    )
                }
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </details>
    </div>
  );
}
