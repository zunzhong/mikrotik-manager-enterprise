import { describe, expect, it } from 'vitest';
import { SentenceDecoder } from './decoder.js';
import { encodeSentence } from './encoder.js';

describe('RouterOS sentence codec', () => {
  it('encodes and decodes a sentence', () => {
    const sentence = ['/system/resource/print', '=detail=', '.tag=abc'];

    const encoded = encodeSentence(sentence);
    const decoder = new SentenceDecoder();
    const decoded = decoder.push(encoded);

    expect(decoded).toEqual([sentence]);
  });

  it('supports split TCP chunks', () => {
    const sentence = ['/login', '=name=admin', '=password=secret'];
    const encoded = encodeSentence(sentence);

    const first = encoded.subarray(0, 3);
    const second = encoded.subarray(3);

    const decoder = new SentenceDecoder();

    expect(decoder.push(first)).toEqual([]);
    expect(decoder.push(second)).toEqual([sentence]);
  });
});
