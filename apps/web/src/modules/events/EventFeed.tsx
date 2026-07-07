import { EventTimeline } from './EventTimeline';
import { useEventFeed } from './useEventFeed';

export interface EventFeedProps {
  deviceId?: string;
  limit?: number;
}

export function EventFeed({ deviceId, limit = 25 }: EventFeedProps) {
  const { events, loading, error, refresh } = useEventFeed({ deviceId, limit });

  return (
    <section className="event-feed">
      <header className="event-feed__header">
        <div>
          <p className="event-feed__eyebrow">Event Bus</p>
          <h3>Recent Events</h3>
          <p className="event-feed__muted">
            In-memory foundation. Database persistence will be added in a later sprint.
          </p>
        </div>

        <button type="button" onClick={() => void refresh()}>
          Refresh
        </button>
      </header>

      {loading ? <p className="event-feed__muted">Loading events...</p> : null}
      {error ? <div className="event-feed__error">{error}</div> : null}

      <EventTimeline events={events} />
    </section>
  );
}
