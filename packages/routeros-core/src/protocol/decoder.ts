import type { RouterOsSentence } from '../types/index.js';
import { PacketAssembler } from './packet-assembler.js';

/**
 * SentenceDecoder
 *
 * Backward-compatible wrapper around PacketAssembler.
 */
export class SentenceDecoder {
  private readonly assembler = new PacketAssembler();

  public push(chunk: Buffer): RouterOsSentence[] {
    return this.assembler.push(chunk);
  }

  public clear(): void {
    this.assembler.clear();
  }
}
