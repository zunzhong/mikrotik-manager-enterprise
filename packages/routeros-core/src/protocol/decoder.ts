import { RouterOsProtocolError } from '../errors/routeros-error.js';
import type { RouterOsSentence } from '../types/index.js';
import { decodeLength } from './length.js';

export class SentenceDecoder {
  private buffer = Buffer.alloc(0);

  public push(chunk: Buffer): RouterOsSentence[] {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const sentences: RouterOsSentence[] = [];

    while (this.buffer.length > 0) {
      const result = this.tryReadSentence();
      if (!result) break;
      sentences.push(result);
    }

    return sentences;
  }

  private tryReadSentence(): RouterOsSentence | null {
    const words: string[] = [];
    let offset = 0;

    while (offset < this.buffer.length) {
      let lengthInfo: { length: number; bytesRead: number };

      try {
        lengthInfo = decodeLength(this.buffer, offset);
      } catch (error) {
        if (error instanceof RouterOsProtocolError) return null;
        throw error;
      }

      offset += lengthInfo.bytesRead;

      if (lengthInfo.length === 0) {
        this.buffer = this.buffer.subarray(offset);
        return words;
      }

      const wordEnd = offset + lengthInfo.length;
      if (this.buffer.length < wordEnd) return null;

      words.push(this.buffer.subarray(offset, wordEnd).toString('utf8'));
      offset = wordEnd;
    }

    return null;
  }
}
