import type { RouterOsRecord } from '../core/routeros-record.js';

export type RouterOsEventType = 'added' | 'removed' | 'changed' | 'unknown';

export interface RouterOsEvent {
  type: RouterOsEventType;
  path: string;
  tag: string;
  id?: string;
  data: RouterOsRecord;
  receivedAt: string;
}

export interface RouterOsSubscription {
  tag: string;
  path: string;
  close(): Promise<void>;
}
