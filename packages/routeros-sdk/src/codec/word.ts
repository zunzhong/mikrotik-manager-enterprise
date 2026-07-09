import { decodeLengthFromBuffer, encodeLength } from './length.js';
export function encodeWord(word: string): Buffer {
  const payload = Buffer.from(word, 'utf8');
  return Buffer.concat([encodeLength(payload.length), payload]);
}
export interface DecodedWord {
  word: string;
  bytesRead: number;
}
export function decodeWordFromBuffer(buffer: Buffer, offset = 0): DecodedWord | null {
  const decoded = decodeLengthFromBuffer(buffer, offset);
  if (!decoded) return null;
  const payloadOffset = offset + decoded.bytesRead;
  const endOffset = payloadOffset + decoded.length;
  if (endOffset > buffer.length) return null;
  return {
    word: decoded.length === 0 ? '' : buffer.subarray(payloadOffset, endOffset).toString('utf8'),
    bytesRead: decoded.bytesRead + decoded.length,
  };
}
