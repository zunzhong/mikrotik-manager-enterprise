import { useMemo, useState } from 'react';
import { SummaryCard } from '../dashboard/components/SummaryCard';
import { WidgetCard } from '../dashboard/components/WidgetCard';
import { notificationApi } from './notification.api';
import type {
  NotificationChannel,
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

function countByStatus(deliveries: NotificationDelivery[], status: NotificationDelivery['status']): number {
  return deliveries.filter((delivery) => delivery.status === status).length;
}

function latestDeliveryAt(deliveries: NotificationDelivery[]): string {
  const latest = deliveries[0]?.createdAt;
  return latest ? new Date(latest).toLocaleString() : 'N/A';
}

function channelName(channels: NotificationChannel[], channelId: string): string {
  return channels.find((channel) => channel.id === channelId)?.name ?? channelId;
}

function channelUrl(channel: NotificationChannel): string {
  const value = channel.config.url;
  return typeof value === 'string' ? value : '';
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [webhookName, setWebhookName] = useState('Enterprise Webhook');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [createRule, setCreateRule] = useState(true);

  const webhookChannels = useMemo(
    () => channels.filter((channel) => channel.type === 'webhook'),
    [channels],
  );

  async function seedDefaults() {
    setBusy(true);
    setActionError(null);

    try {
      await notificationApi.seedDefaults();
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Cannot seed notification defaults');
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setActionError(null);

    try {
      await notificationApi.test();
      await notificationApi.processPending();
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Cannot send notification test');
    } finally {
      setBusy(false);
    }
  }

  async function processPending() {
    setBusy(true);
    setActionError(null);

    try {
      await notificationApi.processPending();
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Cannot process pending deliveries');
    } finally {
      setBusy(false);
    }
  }

  async function createWebhookChannel() {
    const url = webhookUrl.trim();

    if (!url) {
      setActionError('Webhook URL is required.');
      return;
    }

    setBusy(true);
    setActionError(null);

    try {
      const channel = await notificationApi.createChannel({
        name: webhookName.trim() || 'Enterprise Webhook',
        type: 'webhook',
        enabled: true,
        config: {
          url,
          method: 'POST',
          timeoutMs: 10000,
          headers: {
            'x-source': 'mikrotik-manager-enterprise',
          },
        },
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

      setWebhookUrl('');
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Cannot create webhook channel');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="notification-panel">
      <div className="notification-panel__header">
        <div>
          <p className="notification-panel__eyebrow">Notification Engine</p>
          <h3>Channels / Rules / Deliveries</h3>
          <p>
            Event Bus notifications are matched against rules and queued as delivery records.
          </p>
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
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {actionError ? <div className="error-banner">{actionError}</div> : null}

      <div className="notification-panel__cards">
        <SummaryCard label="Channels" value={channels.length} hint={`${webhookChannels.length} webhook`} />
        <SummaryCard label="Rules" value={rules.length} hint="event matchers" />
        <SummaryCard label="Sent" value={countByStatus(deliveries, 'sent')} hint="successful deliveries" />
        <SummaryCard label="Pending" value={countByStatus(deliveries, 'pending')} hint="waiting for worker" />
      </div>

      <WidgetCard title="Create Webhook Channel" description="Send critical events to n8n, webhook.site, or an internal receiver">
        <div className="notification-panel__form">
          <label>
            Name
            <input
              type="text"
              value={webhookName}
              onChange={(event) => setWebhookName(event.target.value)}
              placeholder="Enterprise Webhook"
            />
          </label>

          <label>
            Webhook URL
            <input
              type="url"
              value={webhookUrl}
              onChange={(event) => setWebhookUrl(event.target.value)}
              placeholder="https://example.com/webhook"
            />
          </label>

          <label className="notification-panel__checkbox">
            <input
              type="checkbox"
              checked={createRule}
              onChange={(event) => setCreateRule(event.target.checked)}
            />
            Create critical alert rule
          </label>

          <button type="button" disabled={busy} onClick={() => void createWebhookChannel()}>
            Create Webhook
          </button>
        </div>

        {webhookChannels.length > 0 ? (
          <div className="notification-panel__webhooks">
            {webhookChannels.slice(0, 4).map((channel) => (
              <article key={channel.id}>
                <strong>{channel.name}</strong>
                <small>{channelUrl(channel)}</small>
              </article>
            ))}
          </div>
        ) : null}
      </WidgetCard>

      <div className="notification-panel__grid">
        <WidgetCard title="Notification Rules" description="Active event-to-channel rules">
          <div className="notification-panel__list">
            {rules.slice(0, 8).map((rule) => (
              <article className="notification-panel__row" data-state={rule.enabled ? 'enabled' : 'disabled'} key={rule.id}>
                <div>
                  <strong>{rule.name}</strong>
                  <small>
                    {rule.eventTypes.join(', ')} · {rule.severities.join(', ')}
                  </small>
                </div>
                <span>{rule.enabled ? 'Enabled' : 'Disabled'}</span>
              </article>
            ))}

            {!loading && rules.length === 0 ? (
              <p className="muted">No notification rules yet. Click Seed Defaults to create the first rule.</p>
            ) : null}

            {loading ? <p className="muted">Loading notification rules...</p> : null}
          </div>
        </WidgetCard>

        <WidgetCard title="Recent Deliveries" description={`Latest delivery: ${latestDeliveryAt(deliveries)}`}>
          <div className="notification-panel__list">
            {deliveries.slice(0, 8).map((delivery) => (
              <article className="notification-panel__row" data-state={delivery.status} key={delivery.id}>
                <div>
                  <strong>{delivery.payload.title}</strong>
                  <small>
                    {delivery.payload.eventType} · {delivery.channelType} · {channelName(channels, delivery.channelId)}
                  </small>
                  {delivery.error ? <small>{delivery.error}</small> : null}
                </div>
                <span>{delivery.status}</span>
              </article>
            ))}

            {!loading && deliveries.length === 0 ? (
              <p className="muted">No notification deliveries yet.</p>
            ) : null}

            {loading ? <p className="muted">Loading notification deliveries...</p> : null}
          </div>
        </WidgetCard>
      </div>
    </section>
  );
}
