export function encodeLength(length: number): Buffer {
  if (!Number.isInteger(length) || length < 0) throw new Error(`Invalid RouterOS word length: ${length}`);
  if (length <= 0x7f) return Buffer.from([length]);
  if (length <= 0x3fff) return Buffer.from([(length >> 8) | 0x80, length & 0xff]);
  if (length <= 0x1fffff) return Buffer.from([(length >> 16) | 0xc0, (length >> 8) & 0xff, length & 0xff]);
  if (length <= 0x0fffffff) return Buffer.from([(length >> 24) | 0xe0, (length >> 16) & 0xff, (length >> 8) & 0xff, length & 0xff]);
  if (length <= 0xffffffff) return Buffer.from([0xf0, (length >> 24) & 0xff, (length >> 16) & 0xff, (length >> 8) & 0xff, length & 0xff]);
  throw new Error(`RouterOS word length is too large: ${length}`);
}
export interface DecodedLength { length: number; bytesRead: number; }
export function decodeLengthFromBuffer(buffer: Buffer, offset = 0): DecodedLength | null {
  if (offset >= buffer.length) return null;
  const first = buffer[offset];
  if (first >= 0xf8) throw new Error(`Unsupported RouterOS control byte: 0x${first.toString(16)}`);
  if ((first & 0x80) === 0x00) return { length: first, bytesRead: 1 };
  if ((first & 0xc0) === 0x80) { if (offset + 2 > buffer.length) return null; return { length: ((first & 0x3f) << 8) + buffer[offset + 1], bytesRead: 2 }; }
  if ((first & 0xe0) === 0xc0) { if (offset + 3 > buffer.length) return null; return { length: ((first & 0x1f) << 16) + (buffer[offset+1]<<8) + buffer[offset+2], bytesRead: 3 }; }
  if ((first & 0xf0) === 0xe0) { if (offset + 4 > buffer.length) return null; return { length: ((first & 0x0f)<<24) + (buffer[offset+1]<<16) + (buffer[offset+2]<<8) + buffer[offset+3], bytesRead: 4 }; }
  if (offset + 5 > buffer.length) return null;
  return { length: (buffer[offset+1]<<24) + (buffer[offset+2]<<16) + (buffer[offset+3]<<8) + buffer[offset+4], bytesRead: 5 };
}
