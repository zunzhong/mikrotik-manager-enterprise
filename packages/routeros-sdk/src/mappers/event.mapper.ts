import type { RouterOsRecord } from '../core/routeros-record.js';
import type { RouterOsEvent, RouterOsEventType } from '../models/events.js';
import type { RouterOsReply } from '../protocol/reply.js';

function eventType(record: RouterOsRecord): RouterOsEventType {
  if (record['.dead'] === 'yes' || record.dead === 'yes') return 'removed';
  if (record['.id'] || record.id) return 'changed';
  return 'unknown';
}

export function mapListenReply(path: string, tag: string, reply: RouterOsReply): RouterOsEvent {
  const data = reply.attributes;

  return {
    type: eventType(data),
    path,
    tag,
    id: data['.id'] ?? data.id,
    data,
    receivedAt: new Date().toISOString(),
  };
}
