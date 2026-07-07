import { useEventFeed } from './useEventFeed';

export function NotificationBell() {
  const { events, error } = useEventFeed({ limit: 10 }, 15000);
  const criticalCount = events.filter((event) => event.severity === 'critical').length;
  const warningCount = events.filter((event) => event.severity === 'warning').length;

  return (
    <div className="notification-bell" title={error ?? 'Recent events'}>
      <span>Events</span>
      <strong>{events.length}</strong>
      {criticalCount > 0 ? <em data-severity="critical">{criticalCount}</em> : null}
      {warningCount > 0 ? <em data-severity="warning">{warningCount}</em> : null}
    </div>
  );
}
