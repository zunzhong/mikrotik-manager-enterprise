export interface CoreEvent<TPayload = unknown> {
  id: string;
  type: string;
  payload: TPayload;
  createdAt: Date;
}

export type CoreEventHandler<TPayload = unknown> = (
  event: CoreEvent<TPayload>,
) => void | Promise<void>;

/**
 * EventBus
 *
 * Lightweight in-process event bus.
 * Later this can be backed by Redis Streams or a message queue.
 */
export class EventBus {
  private readonly handlers = new Map<string, Set<CoreEventHandler>>();
  private readonly history: CoreEvent[] = [];

  public on<TPayload = unknown>(type: string, handler: CoreEventHandler<TPayload>): () => void {
    const handlers = this.handlers.get(type) ?? new Set<CoreEventHandler>();
    handlers.add(handler as CoreEventHandler);
    this.handlers.set(type, handlers);

    return () => {
      handlers.delete(handler as CoreEventHandler);
    };
  }

  public async emit<TPayload = unknown>(
    type: string,
    payload: TPayload,
  ): Promise<CoreEvent<TPayload>> {
    const event: CoreEvent<TPayload> = {
      id: crypto.randomUUID(),
      type,
      payload,
      createdAt: new Date(),
    };

    this.history.unshift(event as CoreEvent);
    this.history.splice(100);

    const handlers = this.handlers.get(type) ?? new Set();

    for (const handler of handlers) {
      await handler(event);
    }

    return event;
  }

  public getRecentEvents(): CoreEvent[] {
    return [...this.history];
  }

  public getRegisteredEventTypes(): string[] {
    return [...this.handlers.keys()];
  }
}

export const eventBus = new EventBus();
