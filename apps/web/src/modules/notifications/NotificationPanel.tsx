import { useMemo, useState } from 'react';
import { WidgetCard } from '../dashboard/components/WidgetCard';
import { notificationApi } from './notification.api';
import { useLanguage } from '../../i18n/LanguageContext';
import type {
  NotificationChannel,
  NotificationChannelType,
  NotificationDelivery,
  NotificationRule,
} from './notification.types';
import './notification-panel.css';

export interface NotificationPanelProps {
  channels?: NotificationChannel[];
  rules?: NotificationRule[];
  deliveries?: NotificationDelivery[];
  loading?: boolean;
  error?: string | null;
  onChanged?: () => void;
  devices?: Array<{ id: string; name: string; host: string }>;
}

function resolveChannelName(channels: NotificationChannel[], channelId: string): string {
  return channels.find((channel) => channel.id === channelId)?.name ?? channelId;
}

function channelUrl(channel: NotificationChannel): string {
  return channel.status?.destination ?? channel.type;
}

function canRetry(delivery: NotificationDelivery): boolean {
  return delivery.status === 'failed' || delivery.status === 'skipped';
}

function deliveryTimestamp(
  delivery: NotificationDelivery,
  formatDateTime: (value: string) => string,
): string {
  if (delivery.sentAt) return `sent ${formatDateTime(delivery.sentAt)}`;
  if (delivery.failedAt) return `failed ${formatDateTime(delivery.failedAt)}`;
  if (delivery.skippedAt) return `skipped ${formatDateTime(delivery.skippedAt)}`;
  return `created ${formatDateTime(delivery.createdAt)}`;
}

type EditableChannelType = Exclude<NotificationChannelType, 'in_app'>;
type ChannelFields = Record<string, string | number | boolean>;

function channelTemplate(type: EditableChannelType): ChannelFields {
  if (type === 'telegram') return { botToken: '', chatId: '', timeoutMs: 15000 };
  if (type === 'slack') return { webhookUrl: '', timeoutMs: 10000 };
  if (type === 'webhook') {
    return { url: '', method: 'POST', timeoutMs: 10000, headersJson: '' };
  }
  return {
    host: '',
    port: 587,
    secure: false,
    user: '',
    password: '',
    from: '',
    to: '',
    tlsRejectUnauthorized: true,
  };
}

function editableFields(channel: NotificationChannel): ChannelFields {
  const template = channelTemplate(channel.type as EditableChannelType);
  return Object.fromEntries(
    Object.entries(template).map(([key, fallback]) => {
      const value = channel.config[key];
      return [
        key,
        value === '••••••••' || value === undefined ? fallback : (value as typeof fallback),
      ];
    }),
  );
}

function channelConfigForSave(
  type: EditableChannelType,
  fields: ChannelFields,
): Record<string, unknown> {
  const config: Record<string, unknown> = { ...fields };
  delete config.headersJson;
  if (type !== 'webhook') return config;

  const rawHeaders = String(fields.headersJson ?? '').trim();
  if (!rawHeaders) return config;
  const parsed = JSON.parse(rawHeaders) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Headers webhook phải là một JSON object hợp lệ.');
  }
  config.headers = Object.fromEntries(
    Object.entries(parsed).map(([key, value]) => [key, String(value)]),
  );
  return config;
}

export function NotificationPanel({
  channels = [],
  rules = [],
  deliveries = [],
  loading = false,
  error,
  onChanged,
  devices = [],
}: NotificationPanelProps) {
  const { formatDateTime, tr } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [busyDeliveryId, setBusyDeliveryId] = useState<string | null>(null);
  const [busyEntityId, setBusyEntityId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [channelName, setChannelName] = useState('Kênh thông báo MME');
  const [channelType, setChannelType] = useState<EditableChannelType>('telegram');
  const [channelFields, setChannelFields] = useState<ChannelFields>(() =>
    channelTemplate('telegram'),
  );
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [createRule, setCreateRule] = useState(true);
  const [testingChannelId, setTestingChannelId] = useState<string | null>(null);
  const [testDeviceId, setTestDeviceId] = useState('__all__');

  const retryableCount = useMemo(
    () => deliveries.filter((delivery) => canRetry(delivery)).length,
    [deliveries],
  );
  const testDeliveries = useMemo(
    () => deliveries.filter((delivery) => delivery.payload.eventType === 'CHANNEL_TEST'),
    [deliveries],
  );

  async function runAction(
    action: () => Promise<void>,
    fallbackMessage: string,
    successMessage?: string,
  ) {
    setBusy(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      await action();
      if (successMessage) setActionSuccess(successMessage);
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : fallbackMessage);
    } finally {
      setBusy(false);
    }
  }

  async function seedDefaults() {
    await runAction(async () => {
      await notificationApi.seedDefaults();
    }, 'Không thể tạo cấu hình thông báo mặc định.');
  }

  async function processPending() {
    await runAction(async () => {
      await notificationApi.processPending();
    }, 'Không thể xử lý hàng đợi thông báo.');
  }

  async function retryFailed() {
    await runAction(async () => {
      await notificationApi.retryFailed();
    }, 'Không thể gửi lại các thông báo lỗi.');
  }

  async function toggleChannel(channel: NotificationChannel) {
    setBusyEntityId(channel.id);
    setActionError(null);
    setActionSuccess(null);

    try {
      await notificationApi.updateChannel(channel.id, { enabled: !channel.enabled });
      setActionSuccess(channel.enabled ? 'Đã tắt kênh.' : 'Đã bật kênh.');
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Cannot update channel');
    } finally {
      setBusyEntityId(null);
    }
  }

  async function sendChannelTest(channel: NotificationChannel) {
    setBusyEntityId(channel.id);
    setActionError(null);
    setActionSuccess(null);
    try {
      const result = await notificationApi.testChannel(
        channel.id,
        testDeviceId === '__all__' ? undefined : testDeviceId,
      );
      onChanged?.();
      if (result.failed > 0 || result.skipped > 0) {
        throw new Error(result.deliveries[0]?.error ?? 'Kênh không gửi được thông báo kiểm thử.');
      }
      setActionSuccess(`Kênh “${channel.name}” đã nhận thông báo kiểm thử.`);
      setTestingChannelId(null);
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không thể kiểm thử kênh.');
    } finally {
      setBusyEntityId(null);
    }
  }

  async function deleteChannel(channel: NotificationChannel) {
    if (!window.confirm(`Xóa kênh thông báo "${channel.name}"?`)) {
      return;
    }

    setBusyEntityId(channel.id);
    setActionError(null);
    setActionSuccess(null);

    try {
      const result = await notificationApi.deleteChannel(channel.id);
      if (!result.deleted) throw new Error('Kênh không tồn tại hoặc đã được xóa trước đó.');
      if (editingChannelId === channel.id) cancelChannelEdit();
      setActionSuccess(`Đã xóa kênh “${channel.name}” và dọn các rule không còn kênh nhận.`);
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Cannot delete channel');
    } finally {
      setBusyEntityId(null);
    }
  }

  async function toggleRule(rule: NotificationRule) {
    setBusyEntityId(rule.id);
    setActionError(null);

    try {
      await notificationApi.updateRule(rule.id, { enabled: !rule.enabled });
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Cannot update rule');
    } finally {
      setBusyEntityId(null);
    }
  }

  async function deleteRule(rule: NotificationRule) {
    if (!window.confirm(`Xóa quy tắc thông báo "${rule.name}"?`)) {
      return;
    }

    setBusyEntityId(rule.id);
    setActionError(null);

    try {
      await notificationApi.deleteRule(rule.id);
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Cannot delete rule');
    } finally {
      setBusyEntityId(null);
    }
  }

  async function retryDelivery(delivery: NotificationDelivery) {
    setBusyDeliveryId(delivery.id);
    setActionError(null);

    try {
      await notificationApi.retryDelivery(delivery.id);
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Cannot retry delivery');
    } finally {
      setBusyDeliveryId(null);
    }
  }

  function selectChannelType(type: EditableChannelType) {
    setChannelType(type);
    setChannelFields(channelTemplate(type));
  }

  function updateField(key: string, value: string | number | boolean) {
    setChannelFields((current) => ({ ...current, [key]: value }));
  }

  function editChannel(channel: NotificationChannel) {
    if (channel.type === 'in_app') return;
    setEditingChannelId(channel.id);
    setChannelName(channel.name);
    setChannelType(channel.type);
    setChannelFields(editableFields(channel));
    setActionError(null);
    setActionSuccess(null);
  }

  function cancelChannelEdit() {
    setEditingChannelId(null);
    setChannelName('Kênh thông báo MME');
    setChannelType('telegram');
    setChannelFields(channelTemplate('telegram'));
  }

  async function saveNotificationChannel() {
    await runAction(
      async () => {
        const config = channelConfigForSave(channelType, channelFields);
        if (editingChannelId) {
          await notificationApi.updateChannel(editingChannelId, {
            name: channelName.trim(),
            config,
          });
          cancelChannelEdit();
          return;
        }
        const channel = await notificationApi.createChannel({
          name: channelName.trim() || `MME ${channelType}`,
          type: channelType,
          enabled: true,
          config,
        });

        if (createRule) {
          await notificationApi.createRule({
            name: `${channel.name} Critical Alerts`,
            enabled: true,
            eventTypes: ['ALERT_OPENED', 'DEVICE_OFFLINE', 'DEVICE_CRITICAL'],
            severities: ['critical', 'warning'],
            channelIds: [channel.id],
          });
        }
        cancelChannelEdit();
      },
      'Không thể lưu kênh thông báo.',
      editingChannelId ? 'Đã cập nhật kênh.' : 'Đã tạo kênh mới.',
    );
  }

  return (
    <section className="notification-panel">
      <div className="notification-panel__toolbar">
        <button type="button" disabled={busy} onClick={() => void seedDefaults()}>
          {tr('Tạo mặc định', 'Create defaults')}
        </button>
        <button type="button" disabled={busy} onClick={() => void processPending()}>
          {tr('Gửi hàng đợi', 'Process queue')}
        </button>
        <button
          type="button"
          disabled={busy || retryableCount === 0}
          onClick={() => void retryFailed()}
        >
          {tr('Gửi lại lỗi', 'Retry failed')}
        </button>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {actionError ? <div className="error-banner">{actionError}</div> : null}
      {actionSuccess ? <div className="notification-success">{actionSuccess}</div> : null}

      <div className="notification-system-grid">
        <div className="notification-system-column">
          <WidgetCard title={editingChannelId ? 'Chỉnh sửa kênh thông báo' : 'Thêm kênh thông báo'}>
            <div className="notification-panel__form">
              <label>
                Tên kênh
                <input
                  type="text"
                  value={channelName}
                  onChange={(event) => setChannelName(event.target.value)}
                  placeholder="Kênh cảnh báo MME"
                />
              </label>

              <label>
                Loại kênh
                <select
                  value={channelType}
                  disabled={editingChannelId !== null}
                  onChange={(event) => selectChannelType(event.target.value as EditableChannelType)}
                >
                  <option value="telegram">Telegram</option>
                  <option value="email">Email SMTP</option>
                  <option value="slack">Slack</option>
                  <option value="webhook">Webhook</option>
                </select>
              </label>

              {channelType === 'telegram' ? (
                <div className="notification-fields-grid">
                  <label>
                    Bot Token
                    <input
                      type="password"
                      autoComplete="off"
                      value={String(channelFields.botToken ?? '')}
                      onChange={(event) => updateField('botToken', event.target.value)}
                      placeholder={
                        editingChannelId ? 'Để trống nếu không đổi token' : '123456:ABC...'
                      }
                    />
                  </label>
                  <label>
                    Chat ID / @channel
                    <input
                      type="text"
                      value={String(channelFields.chatId ?? '')}
                      onChange={(event) => updateField('chatId', event.target.value)}
                      placeholder="-1001234567890"
                    />
                  </label>
                </div>
              ) : null}

              {channelType === 'email' ? (
                <div className="notification-fields-grid notification-fields-grid--email">
                  <label>
                    SMTP Host
                    <input
                      type="text"
                      value={String(channelFields.host ?? '')}
                      onChange={(event) => updateField('host', event.target.value)}
                      placeholder="smtp.gmail.com"
                    />
                  </label>
                  <label>
                    Port
                    <input
                      type="number"
                      value={Number(channelFields.port ?? 587)}
                      onChange={(event) => updateField('port', Number(event.target.value))}
                    />
                  </label>
                  <label>
                    Tài khoản SMTP
                    <input
                      type="text"
                      value={String(channelFields.user ?? '')}
                      onChange={(event) => updateField('user', event.target.value)}
                    />
                  </label>
                  <label>
                    Mật khẩu / App Password
                    <input
                      type="password"
                      autoComplete="off"
                      value={String(channelFields.password ?? '')}
                      onChange={(event) => updateField('password', event.target.value)}
                      placeholder={editingChannelId ? 'Để trống nếu không đổi' : ''}
                    />
                  </label>
                  <label>
                    Địa chỉ gửi
                    <input
                      type="email"
                      value={String(channelFields.from ?? '')}
                      onChange={(event) => updateField('from', event.target.value)}
                    />
                  </label>
                  <label>
                    Địa chỉ nhận
                    <input
                      type="email"
                      value={String(channelFields.to ?? '')}
                      onChange={(event) => updateField('to', event.target.value)}
                    />
                  </label>
                  <label className="notification-panel__checkbox">
                    <input
                      type="checkbox"
                      checked={Boolean(channelFields.secure)}
                      onChange={(event) => updateField('secure', event.target.checked)}
                    />{' '}
                    TLS trực tiếp (thường dùng port 465)
                  </label>
                  <label className="notification-panel__checkbox">
                    <input
                      type="checkbox"
                      checked={Boolean(channelFields.tlsRejectUnauthorized)}
                      onChange={(event) =>
                        updateField('tlsRejectUnauthorized', event.target.checked)
                      }
                    />{' '}
                    Xác minh chứng chỉ TLS
                  </label>
                </div>
              ) : null}

              {channelType === 'slack' ? (
                <div className="notification-fields-grid">
                  <label>
                    Slack Incoming Webhook URL
                    <input
                      type="password"
                      autoComplete="off"
                      value={String(channelFields.webhookUrl ?? '')}
                      onChange={(event) => updateField('webhookUrl', event.target.value)}
                      placeholder={
                        editingChannelId
                          ? 'Để trống nếu không đổi URL'
                          : 'https://hooks.slack.com/services/...'
                      }
                    />
                  </label>
                </div>
              ) : null}

              {channelType === 'webhook' ? (
                <div className="notification-fields-grid">
                  <label>
                    Endpoint URL
                    <input
                      type="password"
                      autoComplete="off"
                      value={String(channelFields.url ?? '')}
                      onChange={(event) => updateField('url', event.target.value)}
                      placeholder={
                        editingChannelId
                          ? 'Để trống nếu không đổi URL'
                          : 'https://example.com/mme-alerts'
                      }
                    />
                  </label>
                  <label>
                    Phương thức
                    <select
                      value={String(channelFields.method ?? 'POST')}
                      onChange={(event) => updateField('method', event.target.value)}
                    >
                      <option>POST</option>
                      <option>PUT</option>
                      <option>PATCH</option>
                    </select>
                  </label>
                  <label className="notification-fields-grid__wide">
                    Headers JSON (tùy chọn)
                    <textarea
                      value={String(channelFields.headersJson ?? '')}
                      onChange={(event) => updateField('headersJson', event.target.value)}
                      placeholder={
                        editingChannelId
                          ? 'Để trống nếu không đổi headers hiện tại'
                          : '{"Authorization":"Bearer ..."}'
                      }
                    />
                  </label>
                </div>
              ) : null}

              <label className="notification-panel__checkbox">
                <input
                  type="checkbox"
                  checked={createRule}
                  disabled={editingChannelId !== null}
                  onChange={(event) => setCreateRule(event.target.checked)}
                />
                Tự tạo rule cho cảnh báo critical/warning
              </label>

              <div className="notification-form-actions">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveNotificationChannel()}
                >
                  {editingChannelId ? 'Lưu thay đổi' : 'Tạo và lưu kênh'}
                </button>
                {editingChannelId ? (
                  <button type="button" disabled={busy} onClick={cancelChannelEdit}>
                    Hủy chỉnh sửa
                  </button>
                ) : null}
              </div>
            </div>
          </WidgetCard>

          <WidgetCard title={tr('Quy tắc gửi cảnh báo', 'Alert delivery rules')}>
            <div className="notification-panel__list">
              {rules.map((rule) => (
                <article
                  className="notification-panel__row"
                  data-state={rule.enabled ? 'enabled' : 'disabled'}
                  key={rule.id}
                >
                  <div>
                    <strong>{rule.name}</strong>
                    <small>
                      {rule.eventTypes.join(', ')} · {rule.severities.join(', ')}
                    </small>
                    <small>
                      {tr('Kênh nhận', 'Recipients')}:{' '}
                      {rule.channelIds.map((id) => resolveChannelName(channels, id)).join(', ') ||
                        tr('Không có', 'None')}
                    </small>
                  </div>

                  <div className="notification-panel__entity-actions">
                    <span>
                      {rule.enabled ? tr('Đang bật', 'Enabled') : tr('Đã tắt', 'Disabled')}
                    </span>
                    <button
                      type="button"
                      disabled={busyEntityId === rule.id}
                      onClick={() => void toggleRule(rule)}
                    >
                      {rule.enabled ? tr('Tắt', 'Disable') : tr('Bật', 'Enable')}
                    </button>
                    <button
                      type="button"
                      disabled={busyEntityId === rule.id}
                      onClick={() => void deleteRule(rule)}
                    >
                      {tr('Xóa', 'Delete')}
                    </button>
                  </div>
                </article>
              ))}

              {!loading && rules.length === 0 ? (
                <p className="muted">
                  {tr('Chưa có quy tắc gửi cảnh báo.', 'No alert delivery rules yet.')}
                </p>
              ) : null}

              {loading ? <p className="muted">{tr('Đang tải...', 'Loading...')}</p> : null}
            </div>
          </WidgetCard>
        </div>

        <div className="notification-system-column">
          <WidgetCard title={tr('Kênh nhận thông báo', 'Notification recipients')}>
            <div className="notification-panel__list">
              {channels.map((channel) => (
                <article
                  className="notification-panel__row"
                  data-state={channel.enabled ? 'enabled' : 'disabled'}
                  key={channel.id}
                >
                  <div>
                    <strong>{channel.name}</strong>
                    <small>
                      {channel.type} · {channelUrl(channel)}
                    </small>
                    <small>
                      {channel.status?.configured
                        ? tr('Đã cấu hình đầy đủ', 'Configuration complete')
                        : `${tr('Thiếu cấu hình', 'Missing configuration')}: ${channel.status?.missingFields.join(', ') ?? '—'}`}
                    </small>
                    {channel.status?.lastAttemptAt ? (
                      <small>
                        {tr('Lần gửi gần nhất', 'Last delivery')}:{' '}
                        {formatDateTime(channel.status.lastAttemptAt)} ·{' '}
                        {channel.status.lastDeliveryStatus}
                      </small>
                    ) : null}
                    {channel.status?.lastError ? <small>{channel.status.lastError}</small> : null}
                  </div>

                  <div className="notification-panel__entity-actions">
                    <span>{channel.enabled ? 'Đang bật' : 'Đã tắt'}</span>
                    <button
                      type="button"
                      disabled={busyEntityId === channel.id}
                      onClick={() => {
                        setTestingChannelId((current) =>
                          current === channel.id ? null : channel.id,
                        );
                        setTestDeviceId('__all__');
                      }}
                    >
                      {tr('Kiểm thử', 'Test')}
                    </button>
                    {channel.type !== 'in_app' ? (
                      <button
                        type="button"
                        disabled={busyEntityId === channel.id}
                        onClick={() => editChannel(channel)}
                      >
                        Sửa
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busyEntityId === channel.id}
                      onClick={() => void toggleChannel(channel)}
                    >
                      {channel.enabled ? 'Tắt' : 'Bật'}
                    </button>
                    <button
                      type="button"
                      disabled={busyEntityId === channel.id}
                      onClick={() => void deleteChannel(channel)}
                    >
                      Xóa
                    </button>
                  </div>
                  {testingChannelId === channel.id ? (
                    <div className="notification-channel-test">
                      <label>
                        {tr('Phạm vi kiểm thử', 'Test target')}
                        <select
                          value={testDeviceId}
                          onChange={(event) => setTestDeviceId(event.target.value)}
                        >
                          <option value="__all__">{tr('Toàn bộ thiết bị', 'All devices')}</option>
                          {devices.map((device) => (
                            <option key={device.id} value={device.id}>
                              {device.name} — {device.host}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        disabled={busyEntityId === channel.id}
                        onClick={() => void sendChannelTest(channel)}
                      >
                        {tr('Gửi kiểm thử', 'Send test')}
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}

              {!loading && channels.length === 0 ? (
                <p className="muted">Chưa có kênh nhận cảnh báo.</p>
              ) : null}

              {loading ? <p className="muted">Đang tải kênh cảnh báo...</p> : null}
            </div>
          </WidgetCard>
        </div>
      </div>

      <WidgetCard title={tr('Lịch sử Test', 'Test history')}>
        <div className="notification-panel__list">
          {testDeliveries.slice(0, 20).map((delivery) => (
            <article
              className="notification-panel__row"
              data-state={delivery.status}
              key={delivery.id}
            >
              <div>
                <strong>{delivery.payload.title}</strong>
                <small>
                  {delivery.payload.eventType} · {delivery.channelType} ·{' '}
                  {resolveChannelName(channels, delivery.channelId)}
                </small>
                <small>
                  Số lần thử: {delivery.attempts} · {deliveryTimestamp(delivery, formatDateTime)}
                </small>
                {delivery.error ? <small>{delivery.error}</small> : null}
              </div>

              <div className="notification-panel__delivery-actions">
                <span>{delivery.status}</span>
                {canRetry(delivery) ? (
                  <button
                    type="button"
                    disabled={busyDeliveryId === delivery.id}
                    onClick={() => void retryDelivery(delivery)}
                  >
                    {busyDeliveryId === delivery.id ? 'Đang gửi lại...' : 'Gửi lại'}
                  </button>
                ) : null}
              </div>
            </article>
          ))}

          {!loading && testDeliveries.length === 0 ? (
            <p className="muted">{tr('Chưa có lịch sử kiểm thử.', 'No test history yet.')}</p>
          ) : null}

          {loading ? <p className="muted">Đang tải lịch sử gửi...</p> : null}
        </div>
      </WidgetCard>
    </section>
  );
}
