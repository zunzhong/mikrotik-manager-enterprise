import { useEffect, useState } from 'react';
import { eventApi } from './event.api';
import type { AppEvent, EventQuery } from './event.types';

export function useEventFeed(query: EventQuery = {}, refreshMs = 10000) {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);

    try {
      setEvents(await eventApi.list(query));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot load events');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();

    const timer = window.setInterval(() => {
      void load();
    }, refreshMs);

    return () => window.clearInterval(timer);
  }, [query.deviceId, query.severity, query.type, query.limit, refreshMs]);

  return {
    events,
    loading,
    error,
    refresh: load,
  };
}
