import { useMemo, useState } from 'react';
import { SummaryCard } from '../dashboard/components/SummaryCard';
import { WidgetCard } from '../dashboard/components/WidgetCard';
import { notificationApi } from './notification.api';
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
}

function countByStatus(
  deliveries: NotificationDelivery[],
  status: NotificationDelivery['status'],
): number {
  return deliveries.filter((delivery) => delivery.status === status).length;
}

function latestDeliveryAt(deliveries: NotificationDelivery[]): string {
  const latest = deliveries[0]?.createdAt;
  return latest ? new Date(latest).toLocaleString() : 'N/A';
}

function resolveChannelName(channels: NotificationChannel[], channelId: string): string {
  return channels.find((channel) => channel.id === channelId)?.name ?? channelId;
}

function channelUrl(channel: NotificationChannel): string {
  const value = channel.config.url;
  return typeof value === 'string' ? value : channel.type;
}

function canRetry(delivery: NotificationDelivery): boolean {
  return delivery.status === 'failed' || delivery.status === 'skipped';
}

function deliveryTimestamp(delivery: NotificationDelivery): string {
  if (delivery.sentAt) return `sent ${new Date(delivery.sentAt).toLocaleString()}`;
  if (delivery.failedAt) return `failed ${new Date(delivery.failedAt).toLocaleString()}`;
  if (delivery.skippedAt) return `skipped ${new Date(delivery.skippedAt).toLocaleString()}`;
  return `created ${new Date(delivery.createdAt).toLocaleString()}`;
}

export function NotificationPanel({
  channels = [],
  rules = [],
  deliveries = [],
  loading = false,
  error,
  onChanged,
}: NotificationPanelProps) {
  const [busy, setBusy] = useState(false);
  const [busyDeliveryId, setBusyDeliveryId] = useState<string | null>(null);
  const [busyEntityId, setBusyEntityId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [channelName, setChannelName] = useState('Kênh thông báo MME');
  const [channelType, setChannelType] =
    useState<Exclude<NotificationChannelType, 'in_app'>>('telegram');
  const [channelConfig, setChannelConfig] = useState(
    JSON.stringify({ botToken: '', chatId: '' }, null, 2),
  );
  const [createRule, setCreateRule] = useState(true);

  const webhookChannels = useMemo(
    () => channels.filter((channel) => channel.type === 'webhook'),
    [channels],
  );

  const retryableCount = useMemo(
    () => deliveries.filter((delivery) => canRetry(delivery)).length,
    [deliveries],
  );

  async function runAction(action: () => Promise<void>, fallbackMessage: string) {
    setBusy(true);
    setActionError(null);

    try {
      await action();
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
    }, 'Cannot seed notification defaults');
  }

  async function sendTest() {
    await runAction(async () => {
      await notificationApi.test();
      await notificationApi.processPending();
    }, 'Cannot send notification test');
  }

  async function processPending() {
    await runAction(async () => {
      await notificationApi.processPending();
    }, 'Cannot process pending deliveries');
  }

  async function retryFailed() {
    await runAction(async () => {
      await notificationApi.retryFailed();
    }, 'Cannot retry failed deliveries');
  }

  async function toggleChannel(channel: NotificationChannel) {
    setBusyEntityId(channel.id);
    setActionError(null);

    try {
      await notificationApi.updateChannel(channel.id, { enabled: !channel.enabled });
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Cannot update channel');
    } finally {
      setBusyEntityId(null);
    }
  }

  async function deleteChannel(channel: NotificationChannel) {
    if (!window.confirm(`Delete notification channel "${channel.name}"?`)) {
      return;
    }

    setBusyEntityId(channel.id);
    setActionError(null);

    try {
      await notificationApi.deleteChannel(channel.id);
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
    if (!window.confirm(`Delete notification rule "${rule.name}"?`)) {
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

  function selectChannelType(type: Exclude<NotificationChannelType, 'in_app'>) {
    setChannelType(type);
    const templates: Record<typeof type, Record<string, unknown>> = {
      telegram: { botToken: '', chatId: '' },
      slack: { webhookUrl: '' },
      webhook: { url: '', method: 'POST', timeoutMs: 10000 },
      email: {
        host: '',
        port: 587,
        secure: false,
        user: '',
        password: '',
        from: '',
        to: '',
      },
    };
    setChannelConfig(JSON.stringify(templates[type], null, 2));
  }

  async function createNotificationChannel() {
    let config: Record<string, unknown>;
    try {
      config = JSON.parse(channelConfig) as Record<string, unknown>;
    } catch {
      setActionError('Cấu hình JSON không hợp lệ.');
      return;
    }

    await runAction(async () => {
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
    }, 'Không thể tạo kênh thông báo.');
  }

  return (
    <section className="notification-panel">
      <div className="notification-panel__header">
        <div>
          <p className="notification-panel__eyebrow">Notification Engine</p>
          <h3>Channels / Rules / Deliveries</h3>
          <p>Event Bus notifications are matched against rules and queued as delivery records.</p>
        </div>

        <div className="notification-panel__header-actions">
          <button type="button" disabled={busy} onClick={() => void seedDefaults()}>
            Seed Defaults
          </button>
          <button type="button" disabled={busy} onClick={() => void sendTest()}>
            Send Test
          </button>
          <button type="button" disabled={busy} onClick={() => void processPending()}>
            Process Pending
          </button>
          <button
            type="button"
            disabled={busy || retryableCount === 0}
            onClick={() => void retryFailed()}
          >
            Retry Failed
          </button>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {actionError ? <div className="error-banner">{actionError}</div> : null}

      <div className="notification-panel__cards">
        <SummaryCard
          label="Channels"
          value={channels.length}
          hint={`${webhookChannels.length} webhook`}
        />
        <SummaryCard label="Rules" value={rules.length} hint="event matchers" />
        <SummaryCard
          label="Sent"
          value={countByStatus(deliveries, 'sent')}
          hint="successful deliveries"
        />
        <SummaryCard label="Retryable" value={retryableCount} hint="failed or skipped" />
      </div>

      <WidgetCard title="Tạo kênh thông báo" description="Hỗ trợ Email, Telegram, Slack và Webhook">
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
              onChange={(event) =>
                selectChannelType(event.target.value as Exclude<NotificationChannelType, 'in_app'>)
              }
            >
              <option value="telegram">Telegram</option>
              <option value="email">Email SMTP</option>
              <option value="slack">Slack</option>
              <option value="webhook">Webhook</option>
            </select>
          </label>

          <label>
            Cấu hình JSON
            <textarea
              rows={9}
              value={channelConfig}
              onChange={(event) => setChannelConfig(event.target.value)}
              spellCheck={false}
            />
          </label>

          <label className="notification-panel__checkbox">
            <input
              type="checkbox"
              checked={createRule}
              onChange={(event) => setCreateRule(event.target.checked)}
            />
            Tự tạo rule cho cảnh báo critical/warning
          </label>

          <button type="button" disabled={busy} onClick={() => void createNotificationChannel()}>
            Tạo và lưu kênh
          </button>
        </div>
      </WidgetCard>

      <div className="notification-panel__grid">
        <WidgetCard
          title="Notification Channels"
          description="Enable, disable, or delete notification targets"
        >
          <div className="notification-panel__list">
            {channels.slice(0, 10).map((channel) => (
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
                </div>

                <div className="notification-panel__entity-actions">
                  <span>{channel.enabled ? 'Enabled' : 'Disabled'}</span>
                  <button
                    type="button"
                    disabled={busyEntityId === channel.id}
                    onClick={() => void toggleChannel(channel)}
                  >
                    {channel.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    type="button"
                    disabled={busyEntityId === channel.id}
                    onClick={() => void deleteChannel(channel)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}

            {!loading && channels.length === 0 ? (
              <p className="muted">No notification channels yet.</p>
            ) : null}

            {loading ? <p className="muted">Loading notification channels...</p> : null}
          </div>
        </WidgetCard>

        <WidgetCard
          title="Notification Rules"
          description="Enable, disable, or delete event-to-channel rules"
        >
          <div className="notification-panel__list">
            {rules.slice(0, 10).map((rule) => (
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
                  <small>Channels: {rule.channelIds.length}</small>
                </div>

                <div className="notification-panel__entity-actions">
                  <span>{rule.enabled ? 'Enabled' : 'Disabled'}</span>
                  <button
                    type="button"
                    disabled={busyEntityId === rule.id}
                    onClick={() => void toggleRule(rule)}
                  >
                    {rule.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    type="button"
                    disabled={busyEntityId === rule.id}
                    onClick={() => void deleteRule(rule)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}

            {!loading && rules.length === 0 ? (
              <p className="muted">
                No notification rules yet. Click Seed Defaults to create the first rule.
              </p>
            ) : null}

            {loading ? <p className="muted">Loading notification rules...</p> : null}
          </div>
        </WidgetCard>
      </div>

      <WidgetCard
        title="Recent Deliveries"
        description={`Latest delivery: ${latestDeliveryAt(deliveries)}`}
      >
        <div className="notification-panel__list">
          {deliveries.slice(0, 8).map((delivery) => (
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
                  Attempts: {delivery.attempts} · {deliveryTimestamp(delivery)}
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
                    {busyDeliveryId === delivery.id ? 'Retrying...' : 'Retry'}
                  </button>
                ) : null}
              </div>
            </article>
          ))}

          {!loading && deliveries.length === 0 ? (
            <p className="muted">No notification deliveries yet.</p>
          ) : null}

          {loading ? <p className="muted">Loading notification deliveries...</p> : null}
        </div>
      </WidgetCard>
    </section>
  );
}
