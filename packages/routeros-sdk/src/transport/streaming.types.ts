import type { RouterOsReply } from '../protocol/reply.js';

export interface RouterOsStreamingTransport {
  send(sentence: string[]): Promise<void>;
  onReply(listener: (reply: RouterOsReply) => void): () => void;
}
