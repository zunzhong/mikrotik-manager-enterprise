/**
 * ByteBuffer
 *
 * Append-only readable byte buffer used by the RouterOS protocol decoder.
 *
 * It avoids repeatedly calling Buffer.concat during every small read.
 * Compaction happens only when useful.
 */
export class ByteBuffer {
  private chunks: Buffer[] = [];
  private totalLength = 0;
  private readOffset = 0;

  public get length(): number {
    return this.totalLength - this.readOffset;
  }

  public get isEmpty(): boolean {
    return this.length === 0;
  }

  public append(chunk: Buffer): void {
    if (chunk.length === 0) {
      return;
    }

    this.chunks.push(chunk);
    this.totalLength += chunk.length;
  }

  public peek(length: number): Buffer | null {
    if (length < 0) {
      throw new RangeError('Length cannot be negative');
    }

    if (this.length < length) {
      return null;
    }

    return this.toBuffer().subarray(0, length);
  }

  public read(length: number): Buffer | null {
    const result = this.peek(length);

    if (!result) {
      return null;
    }

    this.readOffset += length;
    this.compactIfNeeded();

    return result;
  }

  public readUInt8(offset = 0): number | null {
    if (offset < 0) {
      throw new RangeError('Offset cannot be negative');
    }

    if (this.length <= offset) {
      return null;
    }

    return this.toBuffer()[offset];
  }

  public clear(): void {
    this.chunks = [];
    this.totalLength = 0;
    this.readOffset = 0;
  }

  public toBuffer(): Buffer {
    if (this.chunks.length === 0) {
      return Buffer.alloc(0);
    }

    const joined = Buffer.concat(this.chunks, this.totalLength);
    return joined.subarray(this.readOffset);
  }

  private compactIfNeeded(): void {
    if (this.readOffset === 0) {
      return;
    }

    if (this.readOffset >= this.totalLength) {
      this.clear();
      return;
    }

    if (this.readOffset > 4096 || this.readOffset > this.totalLength / 2) {
      const remaining = this.toBuffer();
      this.chunks = [remaining];
      this.totalLength = remaining.length;
      this.readOffset = 0;
    }
  }
}
