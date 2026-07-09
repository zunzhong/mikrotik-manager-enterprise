import type { AuditEvent } from './audit.types.js';

export type AuditExportFormat = 'json' | 'csv';

function csvValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  const text = typeof value === 'string' ? value : JSON.stringify(value);
  const escaped = text.replace(/"/g, '""');

  return `"${escaped}"`;
}

export function auditEventsToCsv(events: AuditEvent[]): string {
  const header = [
    'id',
    'createdAt',
    'status',
    'severity',
    'action',
    'actorType',
    'actorId',
    'actorName',
    'entityType',
    'entityId',
    'entityName',
    'summary',
    'metadata',
  ];

  const rows = events.map((event) =>
    [
      event.id,
      event.createdAt,
      event.status,
      event.severity,
      event.action,
      event.actor.type,
      event.actor.id,
      event.actor.name,
      event.entity?.type,
      event.entity?.id,
      event.entity?.name,
      event.summary,
      event.metadata,
    ]
      .map(csvValue)
      .join(','),
  );

  return [header.join(','), ...rows].join('\n');
}

export function auditExportFilename(format: AuditExportFormat): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  return `audit-log-${timestamp}.${format}`;
}
