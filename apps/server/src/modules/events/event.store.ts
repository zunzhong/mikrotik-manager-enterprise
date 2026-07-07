import type { AppEvent, EventQuery } from './event.types.js';

const DEFAULT_LIMIT = 100;
const MAX_EVENTS = 1000;

export class EventStore {
  private readonly events: AppEvent[] = [];

  public add(event: AppEvent): AppEvent {
    this.events.unshift(event);

    if (this.events.length > MAX_EVENTS) {
      this.events.length = MAX_EVENTS;
    }

    return event;
  }

  public list(query: EventQuery = {}): AppEvent[] {
    const limit = Math.min(Math.max(query.limit ?? DEFAULT_LIMIT, 1), MAX_EVENTS);

    return this.events
      .filter((event) => {
        if (query.deviceId && event.deviceId !== query.deviceId) return false;
        if (query.severity && event.severity !== query.severity) return false;
        if (query.type && event.type !== query.type) return false;
        return true;
      })
      .slice(0, limit);
  }

  public recent(limit = 25): AppEvent[] {
    return this.list({ limit });
  }

  public clear(): void {
    this.events.length = 0;
  }
}

export const eventStore = new EventStore();
