import { auditRepository } from './audit.repository.js';
import {
  auditRetentionCutoff,
  type AuditRetentionInput,
  type AuditRetentionResult,
} from './audit.retention.js';
import type {
  AuditActor,
  AuditEntity,
  AuditQueryInput,
  AuditSeverity,
  CreateAuditEventInput,
} from './audit.types.js';

export class AuditService {
  public record(input: CreateAuditEventInput) {
    return auditRepository.create(input);
  }

  public list(query?: AuditQueryInput) {
    return auditRepository.list(query);
  }

  public paginate(query?: AuditQueryInput) {
    return auditRepository.paginate(query);
  }

  public get(eventId: string) {
    return auditRepository.get(eventId);
  }

  public summary(query?: AuditQueryInput) {
    return auditRepository.summary(query);
  }

  public async pruneRetention(input: AuditRetentionInput): Promise<AuditRetentionResult> {
    const dryRun = input.dryRun ?? true;
    const cutoff = auditRetentionCutoff(input.days);
    const matched = await auditRepository.countOlderThan(cutoff);
    const deleted = dryRun ? 0 : await auditRepository.deleteOlderThan(cutoff);

    return {
      dryRun,
      days: input.days,
      cutoff: cutoff.toISOString(),
      matched,
      deleted,
      generatedAt: new Date().toISOString(),
    };
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
    return auditRepository.clear();
  }
}

export const auditService = new AuditService();
