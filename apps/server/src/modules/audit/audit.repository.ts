import { Prisma, type AuditLog } from '@prisma/client';
import { prisma } from '../../database/index.js';
import type {
  AuditActor,
  AuditEntity,
  AuditEvent,
  AuditPageResult,
  AuditQueryInput,
  AuditSeverity,
  AuditStatus,
  AuditSummary,
  CreateAuditEventInput,
} from './audit.types.js';

interface AuditMetadataEnvelope {
  actor?: AuditActor;
  entity?: AuditEntity;
  severity?: AuditSeverity;
  status?: AuditStatus;
  summary?: string;
  metadata?: Record<string, unknown>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeLimit(limit = 100): number {
  return Math.min(Math.max(limit, 1), 1000);
}

function normalizePage(page = 1): number {
  return Math.max(1, page);
}

function normalizePageSize(pageSize = 25): number {
  return Math.min(Math.max(pageSize, 1), 100);
}

function toJsonValue(value: unknown): Prisma.InputJsonValue | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item)) as Prisma.InputJsonArray;
  }

  if (typeof value === 'object') {
    const output: Record<string, Prisma.InputJsonValue | null> = {};

    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item !== undefined) {
        output[key] = toJsonValue(item);
      }
    }

    return output;
  }

  return String(value);
}

function toJsonObject(value: Record<string, unknown>): Prisma.InputJsonObject {
  const output: Record<string, Prisma.InputJsonValue> = {};

  for (const [key, item] of Object.entries(value)) {
    const jsonValue = toJsonValue(item);
    if (jsonValue !== null) {
      output[key] = jsonValue;
    }
  }

  return output as Prisma.InputJsonObject;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && !Array.isArray(value) && typeof value === 'object';
}

function readEnvelope(value: Prisma.JsonValue | null): AuditMetadataEnvelope {
  if (!isPlainObject(value)) {
    return {};
  }

  return value as AuditMetadataEnvelope;
}

function createMetadataEnvelope(input: CreateAuditEventInput): Prisma.InputJsonObject {
  return toJsonObject({
    actor: input.actor,
    entity: input.entity,
    severity: input.severity ?? 'info',
    status: input.status ?? 'success',
    summary: input.summary,
    metadata: input.metadata,
  });
}

function defaultActor(): AuditActor {
  return {
    type: 'system',
    id: 'system',
    name: 'System',
  };
}

function defaultEntity(record: AuditLog): AuditEntity {
  return {
    type: record.entity as AuditEntity['type'],
    id: record.entityId ?? undefined,
  };
}

function toAuditEvent(record: AuditLog): AuditEvent {
  const envelope = readEnvelope(record.metadata);

  return {
    id: record.id,
    action: record.action,
    actor: envelope.actor ?? defaultActor(),
    entity: envelope.entity ?? defaultEntity(record),
    severity: envelope.severity ?? 'info',
    status: envelope.status ?? 'success',
    summary: envelope.summary ?? record.action,
    metadata: envelope.metadata,
    createdAt: record.createdAt.toISOString(),
  };
}

function eventMatches(event: AuditEvent, query: AuditQueryInput): boolean {
  if (query.actorType && event.actor.type !== query.actorType) return false;
  if (query.actorId && event.actor.id !== query.actorId) return false;
  if (query.severity && event.severity !== query.severity) return false;
  if (query.status && event.status !== query.status) return false;

  return true;
}

function prismaWhere(query: AuditQueryInput): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};

  if (query.action) {
    where.action = query.action;
  }

  if (query.entityType) {
    where.entity = query.entityType;
  }

  if (query.entityId) {
    where.entityId = query.entityId;
  }

  if (query.from || query.to) {
    where.createdAt = {
      gte: query.from ? new Date(query.from) : undefined,
      lte: query.to ? new Date(query.to) : undefined,
    };
  }

  return where;
}

export class AuditRepository {
  public async create(input: CreateAuditEventInput): Promise<AuditEvent> {
    const record = await prisma.auditLog.create({
      data: {
        action: input.action,
        entity: input.entity?.type ?? 'system',
        entityId: input.entity?.id,
        ipAddress: input.actor?.ip,
        metadata: createMetadataEnvelope(input),
        createdAt: input.createdAt ? new Date(input.createdAt) : undefined,
      },
    });

    return toAuditEvent(record);
  }

  public async list(query: AuditQueryInput = {}): Promise<AuditEvent[]> {
    const records = await prisma.auditLog.findMany({
      where: prismaWhere(query),
      orderBy: {
        createdAt: 'desc',
      },
      take: normalizeLimit(query.limit),
    });

    return records
      .map((record) => toAuditEvent(record))
      .filter((event) => eventMatches(event, query));
  }

  public async paginate(query: AuditQueryInput = {}): Promise<AuditPageResult> {
    const page = normalizePage(query.page);
    const pageSize = normalizePageSize(query.pageSize);

    const records = await prisma.auditLog.findMany({
      where: prismaWhere(query),
      orderBy: {
        createdAt: 'desc',
      },
      take: 1000,
    });

    const filtered = records
      .map((record) => toAuditEvent(record))
      .filter((event) => eventMatches(event, query));

    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;

    return {
      items: filtered.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages,
      generatedAt: nowIso(),
    };
  }

  public async get(eventId: string): Promise<AuditEvent | null> {
    const record = await prisma.auditLog.findUnique({
      where: {
        id: eventId,
      },
    });

    return record ? toAuditEvent(record) : null;
  }

  public async summary(query: AuditQueryInput = {}): Promise<AuditSummary> {
    const events = await this.list({
      ...query,
      limit: 1000,
    });

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

  public async countOlderThan(cutoff: Date): Promise<number> {
    return prisma.auditLog.count({
      where: {
        createdAt: {
          lt: cutoff,
        },
      },
    });
  }

  public async deleteOlderThan(cutoff: Date): Promise<number> {
    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoff,
        },
      },
    });

    return result.count;
  }

  public async clear(): Promise<void> {
    await prisma.auditLog.deleteMany();
  }
}

export const auditRepository = new AuditRepository();
