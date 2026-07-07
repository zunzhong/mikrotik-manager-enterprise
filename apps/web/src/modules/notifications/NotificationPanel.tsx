import { useState } from 'react';
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
      onChanged?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Cannot send notification test');
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
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {actionError ? <div className="error-banner">{actionError}</div> : null}

      <div className="notification-panel__cards">
        <SummaryCard label="Channels" value={channels.length} hint="notification targets" />
        <SummaryCard label="Rules" value={rules.length} hint="event matchers" />
        <SummaryCard label="Sent" value={countByStatus(deliveries, 'sent')} hint="successful deliveries" />
        <SummaryCard label="Pending" value={countByStatus(deliveries, 'pending')} hint="waiting for worker" />
      </div>

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
