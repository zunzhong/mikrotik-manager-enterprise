import { describe, expect, it } from 'vitest';
import { decodeLength, encodeLength } from './length.js';

describe('RouterOS length codec', () => {
  const values = [0, 1, 10, 127, 128, 255, 16383, 16384, 65535, 2097151];

  it.each(values)('encodes and decodes length %i', (value) => {
    const encoded = encodeLength(value);
    const decoded = decodeLength(encoded);

    expect(decoded.length).toBe(value);
    expect(decoded.bytesRead).toBe(encoded.length);
  });

  it('throws for negative length', () => {
    expect(() => encodeLength(-1)).toThrow();
  });

  it('throws for non-integer length', () => {
    expect(() => encodeLength(1.5)).toThrow();
  });
});
