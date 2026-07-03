import { auditLogRepository } from './audit-log.repository.js';

export interface WriteAuditLogInput {
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * AuditService
 *
 * Writes enterprise audit records.
 */
export class AuditService {
  public async write(input: WriteAuditLogInput) {
    return auditLogRepository.create({
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      metadata: input.metadata,
    });
  }

  public async list() {
    return auditLogRepository.findMany({
      take: 100,
    });
  }
}

export const auditService = new AuditService();
