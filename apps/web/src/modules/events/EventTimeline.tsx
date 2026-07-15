import type { AppEvent } from './event.types';
import { useLanguage } from '../../i18n/LanguageContext';

export interface EventTimelineProps {
  events: AppEvent[];
}

export function EventTimeline({ events }: EventTimelineProps) {
  const { formatDateTime } = useLanguage();
  if (events.length === 0) {
    return (
      <div className="event-timeline__empty">
        <strong>No events yet</strong>
        <p>System, device and alert events will appear here.</p>
      </div>
    );
  }

  return (
    <div className="event-timeline">
      {events.map((event) => (
        <article className="event-timeline__item" data-severity={event.severity} key={event.id}>
          <span className="event-timeline__dot" />
          <div>
            <div className="event-timeline__head">
              <strong>{event.title}</strong>
              <time>{formatDateTime(event.createdAt)}</time>
            </div>
            <p>{event.message}</p>
            <small>
              {event.type} · {event.source}
              {event.deviceName ? ` · ${event.deviceName}` : ''}
            </small>
          </div>
        </article>
      ))}
    </div>
  );
}
