import { decodeWordFromBuffer } from './word.js';
export class RouterOsSentenceParser {
  private buffer = Buffer.alloc(0); private current: string[] = [];
  public push(chunk: Buffer): string[][] {
    this.buffer = Buffer.concat([this.buffer, chunk]); const sentences: string[][] = []; let offset = 0;
    while (offset < this.buffer.length) { const decoded = decodeWordFromBuffer(this.buffer, offset); if (!decoded) break; offset += decoded.bytesRead; if (decoded.word === '') { sentences.push(this.current); this.current = []; } else this.current.push(decoded.word); }
    this.buffer = this.buffer.subarray(offset); return sentences;
  }
  public reset(): void { this.buffer = Buffer.alloc(0); this.current = []; }
}
