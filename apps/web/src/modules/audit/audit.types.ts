export type AuditActorType = 'system' | 'user' | 'api' | 'agent' | 'scheduler';
export type AuditEntityType =
  | 'system'
  | 'device'
  | 'event'
  | 'alert'
  | 'notification_channel'
  | 'notification_rule'
  | 'notification_delivery'
  | 'auth'
  | 'config';

export type AuditSeverity = 'info' | 'warning' | 'critical';
export type AuditStatus = 'success' | 'failure';

export interface AuditActor {
  type: AuditActorType;
  id?: string;
  name?: string;
  ip?: string;
  userAgent?: string;
}

export interface AuditEntity {
  type: AuditEntityType;
  id?: string;
  name?: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  actor: AuditActor;
  entity?: AuditEntity;
  severity: AuditSeverity;
  status: AuditStatus;
  summary: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CreateAuditEventInput {
  action: string;
  actor?: AuditActor;
  entity?: AuditEntity;
  severity?: AuditSeverity;
  status?: AuditStatus;
  summary: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface AuditQueryInput {
  limit?: number;
  page?: number;
  pageSize?: number;
  action?: string;
  actorType?: AuditActorType;
  actorId?: string;
  entityType?: AuditEntityType;
  entityId?: string;
  severity?: AuditSeverity;
  status?: AuditStatus;
  from?: string;
  to?: string;
}

export interface AuditPageResult {
  items: AuditEvent[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  generatedAt: string;
}

export interface AuditSummary {
  total: number;
  success: number;
  failure: number;
  info: number;
  warning: number;
  critical: number;
  generatedAt: string;
}

export interface AuditSeedDemoResult {
  created: number;
  events: AuditEvent[];
}

export interface AuditRetentionInput {
  days: number;
  dryRun?: boolean;
}

export interface AuditRetentionResult {
  dryRun: boolean;
  days: number;
  cutoff: string;
  matched: number;
  deleted: number;
  generatedAt: string;
}
