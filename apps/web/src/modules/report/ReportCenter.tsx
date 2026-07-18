import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { reportApi } from './report.api';
import type { ReportChannelMode, ReportOverview, ReportSchedule } from './report.types';

type IntervalUnit = 'minutes' | 'hours' | 'days';

function localDateTimeInput(value: Date): string {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

function intervalParts(minutes: number): { value: number; unit: IntervalUnit } {
  if (minutes % 1440 === 0) return { value: minutes / 1440, unit: 'days' };
  if (minutes % 60 === 0) return { value: minutes / 60, unit: 'hours' };
  return { value: minutes, unit: 'minutes' };
}

function intervalMinutes(value: number, unit: IntervalUnit): number {
  if (unit === 'days') return value * 1440;
  if (unit === 'hours') return value * 60;
  return value;
}

export function ReportCenter() {
  const { formatDateTime, tr } = useLanguage();
  const [overview, setOverview] = useState<ReportOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('Báo cáo RouterOS định kỳ');
  const [enabled, setEnabled] = useState(true);
  const [allDevices, setAllDevices] = useState(true);
  const [deviceIds, setDeviceIds] = useState<string[]>([]);
  const [startAt, setStartAt] = useState(() => localDateTimeInput(new Date(Date.now() + 300_000)));
  const [intervalValue, setIntervalValue] = useState(1);
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>('hours');
  const [channelMode, setChannelMode] = useState<ReportChannelMode>('existing');
  const [channelId, setChannelId] = useState('');
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportApi.overview();
      setOverview(data);
      setChannelId((current) => current || data.telegramChannels[0]?.id || '');
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : tr('Không tải được cấu hình báo cáo.', 'Unable to load report settings.'),
      );
    } finally {
      setLoading(false);
    }
  }, [tr]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedDeviceNames = useMemo(
    () =>
      overview?.devices
        .filter((device) => deviceIds.includes(device.id))
        .map((device) => device.name) ?? [],
    [deviceIds, overview?.devices],
  );

  function resetForm() {
    setEditingId(null);
    setName(tr('Báo cáo RouterOS định kỳ', 'Periodic RouterOS report'));
    setEnabled(true);
    setAllDevices(true);
    setDeviceIds([]);
    setStartAt(localDateTimeInput(new Date(Date.now() + 300_000)));
    setIntervalValue(1);
    setIntervalUnit('hours');
    setChannelMode('existing');
    setChannelId(overview?.telegramChannels[0]?.id ?? '');
    setBotToken('');
    setChatId('');
  }

  function editSchedule(schedule: ReportSchedule) {
    const interval = intervalParts(schedule.intervalMinutes);
    const channel = overview?.telegramChannels.find((item) => item.id === schedule.channelId);
    setEditingId(schedule.id);
    setName(schedule.name);
    setEnabled(schedule.enabled);
    setAllDevices(schedule.allDevices);
    setDeviceIds(schedule.deviceIds);
    setStartAt(localDateTimeInput(new Date(schedule.startAt)));
    setIntervalValue(interval.value);
    setIntervalUnit(interval.unit);
    setChannelMode(schedule.channelMode);
    setChannelId(schedule.channelId);
    setBotToken('');
    setChatId(typeof channel?.config.chatId === 'string' ? channel.config.chatId : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy('save');
    setError(null);
    setSuccess(null);
    try {
      const input = {
        name,
        enabled,
        allDevices,
        deviceIds,
        startAt: new Date(startAt).toISOString(),
        intervalMinutes: intervalMinutes(Math.max(1, intervalValue), intervalUnit),
        channelMode,
        channelId: channelMode === 'existing' ? channelId : editingId ? channelId : undefined,
        telegram: channelMode === 'dedicated' ? { botToken, chatId } : undefined,
      };
      if (editingId) await reportApi.update(editingId, input);
      else await reportApi.create(input);
      setSuccess(tr('Đã lưu lịch gửi báo cáo.', 'Report schedule saved.'));
      resetForm();
      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : tr('Không lưu được lịch.', 'Unable to save schedule.'),
      );
    } finally {
      setBusy(null);
    }
  }

  async function remove(schedule: ReportSchedule) {
    if (!window.confirm(tr(`Xóa lịch “${schedule.name}”?`, `Delete “${schedule.name}”?`))) return;
    setBusy(schedule.id);
    setError(null);
    try {
      await reportApi.delete(schedule.id);
      await load();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : tr('Không xóa được lịch.', 'Unable to delete schedule.'),
      );
    } finally {
      setBusy(null);
    }
  }

  async function send(schedule: ReportSchedule) {
    setBusy(`send:${schedule.id}`);
    setError(null);
    setSuccess(null);
    try {
      const results = await reportApi.send(schedule.id);
      const sent = results.filter((item) => item.status === 'sent').length;
      setSuccess(
        tr(
          `Đã gửi ${sent}/${results.length} báo cáo qua Telegram.`,
          `Sent ${sent}/${results.length} Telegram reports.`,
        ),
      );
      await load();
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : tr('Không gửi được báo cáo.', 'Unable to send report.'),
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="report-center">
      {error ? <div className="error-banner">{error}</div> : null}
      {success ? <div className="success-banner">{success}</div> : null}

      <form className="report-panel report-form" onSubmit={(event) => void save(event)}>
        <div className="report-panel-heading">
          <div>
            <h3>
              {editingId
                ? tr('Chỉnh sửa lịch báo cáo', 'Edit report schedule')
                : tr('Tạo lịch báo cáo Telegram', 'Create Telegram report schedule')}
            </h3>
          </div>
          <label className="report-switch">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            <span>{tr('Bật lịch', 'Enable schedule')}</span>
          </label>
        </div>

        <div className="report-form-grid">
          <label>
            <span>{tr('Tên lịch', 'Schedule name')}</span>
            <input required value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            <span>{tr('Thời gian bắt đầu', 'Start time')}</span>
            <input
              type="datetime-local"
              required
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
            />
          </label>
          <label>
            <span>{tr('Chu kỳ', 'Interval')}</span>
            <div className="report-inline-fields">
              <input
                type="number"
                min="1"
                value={intervalValue}
                onChange={(event) => setIntervalValue(Number(event.target.value))}
              />
              <select
                value={intervalUnit}
                onChange={(event) => setIntervalUnit(event.target.value as IntervalUnit)}
              >
                <option value="minutes">{tr('Phút', 'Minutes')}</option>
                <option value="hours">{tr('Giờ', 'Hours')}</option>
                <option value="days">{tr('Ngày', 'Days')}</option>
              </select>
            </div>
          </label>
          <label>
            <span>{tr('Nguồn Telegram', 'Telegram source')}</span>
            <select
              value={channelMode}
              onChange={(event) => setChannelMode(event.target.value as ReportChannelMode)}
            >
              <option value="existing">
                {tr('Dùng token/Chat ID trong Cảnh báo', 'Use an Alert Telegram channel')}
              </option>
              <option value="dedicated">
                {tr('Token/Chat ID riêng cho Báo cáo', 'Dedicated report token/Chat ID')}
              </option>
            </select>
          </label>
        </div>

        {channelMode === 'existing' ? (
          <label className="report-wide-field">
            <span>{tr('Kênh Telegram có sẵn', 'Existing Telegram channel')}</span>
            <select
              required
              value={channelId}
              onChange={(event) => setChannelId(event.target.value)}
            >
              <option value="">{tr('Chọn kênh', 'Select a channel')}</option>
              {(overview?.telegramChannels ?? []).map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name} · {channel.status?.destination ?? '—'}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="report-form-grid">
            <label>
              <span>Bot Token</span>
              <input
                type="password"
                required={!editingId}
                value={botToken}
                placeholder={
                  editingId
                    ? tr('Để trống nếu giữ token cũ', 'Leave blank to keep current token')
                    : ''
                }
                onChange={(event) => setBotToken(event.target.value)}
              />
            </label>
            <label>
              <span>Chat ID</span>
              <input required value={chatId} onChange={(event) => setChatId(event.target.value)} />
            </label>
          </div>
        )}

        <fieldset className="report-device-picker">
          <legend>{tr('Thiết bị nhận báo cáo', 'Devices in report')}</legend>
          <label className="report-switch">
            <input
              type="checkbox"
              checked={allDevices}
              onChange={(event) => setAllDevices(event.target.checked)}
            />
            <span>{tr('Toàn bộ thiết bị', 'All devices')}</span>
          </label>
          {!allDevices ? (
            <div className="report-device-grid">
              {(overview?.devices ?? []).map((device) => (
                <label key={device.id}>
                  <input
                    type="checkbox"
                    checked={deviceIds.includes(device.id)}
                    onChange={(event) =>
                      setDeviceIds((current) =>
                        event.target.checked
                          ? [...current, device.id]
                          : current.filter((id) => id !== device.id),
                      )
                    }
                  />
                  <span>
                    {device.name} · {device.host}
                  </span>
                </label>
              ))}
            </div>
          ) : null}
          {!allDevices && selectedDeviceNames.length > 0 ? (
            <small>{selectedDeviceNames.join(', ')}</small>
          ) : null}
        </fieldset>

        <div className="report-actions">
          <button className="primary-button" type="submit" disabled={busy === 'save'}>
            {busy === 'save' ? tr('Đang lưu...', 'Saving...') : tr('Lưu lịch', 'Save schedule')}
          </button>
          {editingId ? (
            <button type="button" className="secondary-button" onClick={resetForm}>
              {tr('Hủy chỉnh sửa', 'Cancel edit')}
            </button>
          ) : null}
        </div>
      </form>

      <section className="report-panel">
        <h3>{tr('Lịch báo cáo', 'Report schedules')}</h3>
        <div className="report-schedule-list">
          {(overview?.schedules ?? []).map((schedule) => (
            <article className="report-schedule" key={schedule.id}>
              <div>
                <div className="report-schedule-title">
                  <strong>{schedule.name}</strong>
                  <span
                    className={`status-badge status-${schedule.enabled ? 'online' : 'offline'}`}
                  >
                    {schedule.enabled ? tr('Đang bật', 'Enabled') : tr('Đã tắt', 'Disabled')}
                  </span>
                </div>
                <p>
                  {schedule.allDevices
                    ? tr('Toàn bộ thiết bị', 'All devices')
                    : `${schedule.deviceIds.length} ${tr('thiết bị', 'devices')}`}{' '}
                  · {schedule.intervalMinutes} {tr('phút', 'minutes')}
                </p>
                <small>
                  {schedule.nextRunAt
                    ? `${tr('Lần kế tiếp', 'Next run')}: ${formatDateTime(schedule.nextRunAt)}`
                    : tr('Không có lần chạy kế tiếp', 'No next run')}
                </small>
              </div>
              <div className="report-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => editSchedule(schedule)}
                >
                  {tr('Sửa', 'Edit')}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={busy === `send:${schedule.id}`}
                  onClick={() => void send(schedule)}
                >
                  {busy === `send:${schedule.id}`
                    ? tr('Đang gửi...', 'Sending...')
                    : tr('Gửi ngay', 'Send now')}
                </button>
                <button
                  className="danger-button"
                  type="button"
                  disabled={busy === schedule.id}
                  onClick={() => void remove(schedule)}
                >
                  {tr('Xóa', 'Delete')}
                </button>
              </div>
            </article>
          ))}
          {!loading && (overview?.schedules.length ?? 0) === 0 ? (
            <div className="empty-state">
              {tr('Chưa có lịch báo cáo.', 'No report schedules yet.')}
            </div>
          ) : null}
        </div>
      </section>

      <section className="report-panel">
        <h3>{tr('Lịch sử gửi báo cáo', 'Report delivery history')}</h3>
        <div className="report-history">
          {(overview?.history ?? []).map((item) => (
            <article key={item.id}>
              <span
                className={`status-badge status-${item.status === 'sent' ? 'online' : 'offline'}`}
              >
                {item.status === 'sent' ? tr('Đã gửi', 'Sent') : tr('Thất bại', 'Failed')}
              </span>
              <div>
                <strong>{item.identity}</strong>
                <p>
                  {item.scheduleName} · {formatDateTime(item.createdAt)}
                </p>
                {item.error ? <small>{item.error}</small> : null}
              </div>
            </article>
          ))}
          {!loading && (overview?.history.length ?? 0) === 0 ? (
            <div className="empty-state">
              {tr('Chưa có lịch sử gửi.', 'No delivery history yet.')}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
