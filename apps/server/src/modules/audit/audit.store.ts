import type {
  AuditEvent,
  AuditQueryInput,
  AuditSummary,
  CreateAuditEventInput,
} from './audit.types.js';

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeLimit(limit = 100): number {
  return Math.min(Math.max(limit, 1), 1000);
}

function timestampMatches(event: AuditEvent, query: AuditQueryInput): boolean {
  const createdAt = Date.parse(event.createdAt);

  if (query.from && createdAt < Date.parse(query.from)) {
    return false;
  }

  if (query.to && createdAt > Date.parse(query.to)) {
    return false;
  }

  return true;
}

function eventMatches(event: AuditEvent, query: AuditQueryInput): boolean {
  if (query.action && event.action !== query.action) return false;
  if (query.actorType && event.actor.type !== query.actorType) return false;
  if (query.actorId && event.actor.id !== query.actorId) return false;
  if (query.entityType && event.entity?.type !== query.entityType) return false;
  if (query.entityId && event.entity?.id !== query.entityId) return false;
  if (query.severity && event.severity !== query.severity) return false;
  if (query.status && event.status !== query.status) return false;

  return timestampMatches(event, query);
}

export class AuditStore {
  private readonly events = new Map<string, AuditEvent>();

  public create(input: CreateAuditEventInput): AuditEvent {
    const event: AuditEvent = {
      id: createId('audit'),
      action: input.action,
      actor: input.actor ?? {
        type: 'system',
        id: 'system',
        name: 'System',
      },
      entity: input.entity,
      severity: input.severity ?? 'info',
      status: input.status ?? 'success',
      summary: input.summary,
      metadata: input.metadata,
      createdAt: input.createdAt ?? nowIso(),
    };

    this.events.set(event.id, event);

    return event;
  }

  public list(query: AuditQueryInput = {}): AuditEvent[] {
    const limit = normalizeLimit(query.limit);

    return [...this.events.values()]
      .filter((event) => eventMatches(event, query))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  public get(eventId: string): AuditEvent | null {
    return this.events.get(eventId) ?? null;
  }

  public summary(query: AuditQueryInput = {}): AuditSummary {
    const events = [...this.events.values()].filter((event) => eventMatches(event, query));

    return {
      total: events.length,
      success: events.filter((event) => event.status === 'success').length,
      failure: events.filter((event) => event.status === 'failure').length,
      info: events.filter((event) => event.severity === 'info').length,
      warning: events.filter((event) => event.severity === 'warning').length,
      critical: events.filter((event) => event.severity === 'critical').length,
      generatedAt: nowIso(),
    };
  }

  public clear(): void {
    this.events.clear();
  }
}

export const auditStore = new AuditStore();
