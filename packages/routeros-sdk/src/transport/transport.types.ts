import type { RouterOsSentence } from '../codec/sentence.js';
import type { RouterOsReply } from '../protocol/reply.js';

export interface RouterOsTransport {
  connect(): Promise<void>;
  close(): void;
  send(sentence: RouterOsSentence): Promise<void>;
  readReplySet(timeoutMs?: number): Promise<RouterOsReply[]>;
  onReply?(listener: (reply: RouterOsReply) => void): () => void;
}

export interface RouterOsTransportOptions {
  host: string;
  port?: number;
  timeoutMs?: number;
  tls?: boolean;
  rejectUnauthorized?: boolean;
}
