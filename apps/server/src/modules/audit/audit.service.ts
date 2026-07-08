import { auditStore } from './audit.store.js';
import type {
  AuditActor,
  AuditEntity,
  AuditQueryInput,
  AuditSeverity,
  CreateAuditEventInput,
} from './audit.types.js';

export class AuditService {
  public record(input: CreateAuditEventInput) {
    return auditStore.create(input);
  }

  public list(query?: AuditQueryInput) {
    return auditStore.list(query);
  }

  public get(eventId: string) {
    return auditStore.get(eventId);
  }

  public summary(query?: AuditQueryInput) {
    return auditStore.summary(query);
  }

  public logSuccess(input: {
    action: string;
    summary: string;
    actor?: AuditActor;
    entity?: AuditEntity;
    severity?: AuditSeverity;
    metadata?: Record<string, unknown>;
  }) {
    return this.record({
      action: input.action,
      summary: input.summary,
      actor: input.actor,
      entity: input.entity,
      severity: input.severity ?? 'info',
      status: 'success',
      metadata: input.metadata,
    });
  }

  public logFailure(input: {
    action: string;
    summary: string;
    actor?: AuditActor;
    entity?: AuditEntity;
    severity?: AuditSeverity;
    metadata?: Record<string, unknown>;
  }) {
    return this.record({
      action: input.action,
      summary: input.summary,
      actor: input.actor,
      entity: input.entity,
      severity: input.severity ?? 'warning',
      status: 'failure',
      metadata: input.metadata,
    });
  }

  public clear() {
    auditStore.clear();
  }
}

export const auditService = new AuditService();
