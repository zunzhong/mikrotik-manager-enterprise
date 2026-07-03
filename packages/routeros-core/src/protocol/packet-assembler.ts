import { ByteBuffer } from '../buffer/byte-buffer.js';
import { RouterOsProtocolError } from '../errors/routeros-error.js';
import { decodeLength } from './length.js';
import type { RouterOsSentence } from '../types/index.js';

/**
 * PacketAssembler
 *
 * Converts raw TCP chunks into complete RouterOS API sentences.
 *
 * RouterOS API is word based. Each word is prefixed by a variable-length
 * length field. A zero-length word terminates a sentence.
 */
export class PacketAssembler {
  private readonly buffer = new ByteBuffer();

  public push(chunk: Buffer): RouterOsSentence[] {
    this.buffer.append(chunk);

    const sentences: RouterOsSentence[] = [];

    while (!this.buffer.isEmpty) {
      const sentence = this.tryReadSentence();

      if (!sentence) {
        break;
      }

      sentences.push(sentence);
    }

    return sentences;
  }

  public clear(): void {
    this.buffer.clear();
  }

  private tryReadSentence(): RouterOsSentence | null {
    const snapshot = this.buffer.toBuffer();
    const words: string[] = [];
    let offset = 0;

    while (offset < snapshot.length) {
      let lengthInfo: { length: number; bytesRead: number };

      try {
        lengthInfo = decodeLength(snapshot, offset);
      } catch (error) {
        if (error instanceof RouterOsProtocolError) {
          return null;
        }

        throw error;
      }

      offset += lengthInfo.bytesRead;

      if (lengthInfo.length === 0) {
        this.buffer.read(offset);
        return words;
      }

      const wordEnd = offset + lengthInfo.length;

      if (snapshot.length < wordEnd) {
        return null;
      }

      words.push(snapshot.subarray(offset, wordEnd).toString('utf8'));
      offset = wordEnd;
    }

    return null;
  }
}
