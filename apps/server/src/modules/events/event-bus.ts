import { randomUUID } from 'node:crypto';
import { eventStore } from './event.store.js';
import type { AppEvent, PublishEventInput } from './event.types.js';

export type EventListener = (event: AppEvent) => void | Promise<void>;

export class EventBus {
  private readonly listeners = new Set<EventListener>();

  public publish(input: PublishEventInput): AppEvent {
    const event: AppEvent = {
      id: randomUUID(),
      type: input.type,
      severity: input.severity ?? 'info',
      title: input.title,
      message: input.message,
      createdAt: new Date().toISOString(),
      source: input.source ?? 'system',
      deviceId: input.deviceId,
      deviceName: input.deviceName,
      metadata: input.metadata,
    };

    eventStore.add(event);

    for (const listener of this.listeners) {
      void Promise.resolve(listener(event)).catch(() => {
        // Listener failures must not break event publishing.
      });
    }

    return event;
  }

  public subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  public listenerCount(): number {
    return this.listeners.size;
  }
}

export const eventBus = new EventBus();
